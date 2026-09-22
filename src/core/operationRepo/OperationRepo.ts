import {
  ExecutionResult,
  type IOperationExecutor,
  type IOperationRepo,
  type ExecutionResultValue,
  type IStartableService,
} from 'src/core/types/operation';
import { db } from 'src/shared/database/client';
import { OperationFailedError } from 'src/shared/errors/common';
import { delay } from 'src/shared/helpers/general';
import Log from 'src/shared/libraries/Log';

import {
  isIvBehaviorActive,
  isIvCodePathEnabled,
  isJwtRequirementUnknown,
} from '../identityVerification';
import { type JwtTokenStore } from '../JwtTokenStore';
import { type OperationModelStore } from '../modelRepo/OperationModelStore';
import { LoginUserOperation } from '../operations/LoginUserOperation';
import { GroupComparisonType, type Operation } from '../operations/Operation';
import {
  OP_REPO_DEFAULT_FAIL_RETRY_BACKOFF,
  OP_REPO_EXECUTION_INTERVAL,
  OP_REPO_POST_CREATE_DELAY,
} from './constants';
import { type NewRecordsState } from './NewRecordsState';

const removeOpFromDB = (op: Operation) => {
  void db.delete('operations', op._modelId);
};

// Implements logic similar to Android SDK's OperationRepo & OperationQueueItem
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/core/internal/operations/impl/OperationRepo.kt
export interface OperationQueueItem {
  operation: Operation;
  bucket: number;
  retries: number;
  /** Wakes an _enqueueAndWait caller. A false value must carry the result. */
  resolver?: (value: boolean, result?: ExecutionResultValue) => void;
}

// OperationRepo Class
export class OperationRepo implements IOperationRepo, IStartableService {
  private _executorsMap: Map<string, IOperationExecutor>;
  public _queue: OperationQueueItem[] = [];
  public _timerID: NodeJS.Timeout | undefined = undefined;
  private _enqueueIntoBucket = 0;
  private _operationModelStore: OperationModelStore;
  private _newRecordState: NewRecordsState;
  private _jwtTokenStore: JwtTokenStore;
  private _loggedUnknownDeferral = false;

  constructor(
    executors: IOperationExecutor[],
    operationModelStore: OperationModelStore,
    newRecordState: NewRecordsState,
    jwtTokenStore: JwtTokenStore,
  ) {
    this._operationModelStore = operationModelStore;
    this._newRecordState = newRecordState;
    this._jwtTokenStore = jwtTokenStore;

    this._executorsMap = new Map<string, IOperationExecutor>();
    for (const executor of executors) {
      for (const operation of executor._operations) {
        this._executorsMap.set(operation, executor);
      }
    }
  }

  public _clear(): void {
    this._queue = [];
  }

  public get _records(): Map<string, number> {
    return this._newRecordState._records;
  }

  private get _executeBucket(): number {
    return this._enqueueIntoBucket === 0 ? 0 : this._enqueueIntoBucket - 1;
  }

  public _containsInstanceOf<T extends Operation>(type: new (...args: any[]) => T): boolean {
    return this._queue.some((item) => item.operation instanceof type);
  }

  public async _start(): Promise<void> {
    await this._loadSavedOperations();
    // The page fetches the config before the repo starts, so the requirement is
    // already hydrated here. This is the web equivalent of Android's hydrate hook.
    if (isIvBehaviorActive()) this._purgeAnonymousOperations();
    this._processQueueForever();
  }

  public _pause(): void {
    clearInterval(this._timerID);
    this._timerID = undefined;
    Log._debug('OpRepo: Paused');
  }

  public _enqueue(operation: Operation): void {
    if (this._shouldSuppressAnonymousOp(operation)) return;
    Log._debug(`OpRepo.enqueue: ${JSON.stringify(operation)}`);

    this._internalEnqueue(
      {
        operation,
        bucket: this._enqueueIntoBucket,
        retries: 0,
      },
      true,
    );
  }

  /**
   * Resolves when the operation succeeds. Rejects with an OperationFailedError
   * that carries the ExecutionResult that stopped the operation.
   */
  public async _enqueueAndWait(operation: Operation): Promise<void> {
    if (this._shouldSuppressAnonymousOp(operation)) {
      throw new OperationFailedError(ExecutionResult._Suppressed);
    }
    Log._debug(`OpRepo.enqueueAndWait: ${JSON.stringify(operation)}`);

    await new Promise<void>((resolve, reject) => {
      this._internalEnqueue(
        {
          operation,
          bucket: this._enqueueIntoBucket,
          retries: 0,
          resolver: (value, result = ExecutionResult._FailNoretry) =>
            value ? resolve() : reject(new OperationFailedError(result)),
        },
        true,
      );
    });
  }

  /**
   * An anonymous operation can never dispatch while IV behavior is active: the gate
   * needs a token and an anonymous user has none. Drop it at enqueue instead of
   * holding it forever. LoginUserOperation is exempt; login and the push grant
   * enqueue it on purpose, and the load-time purge removes a stale one. An
   * operation that needs no JWT is exempt too; the gate lets it through.
   * Outer gate isIvCodePathEnabled keeps the legacy enqueue path unchanged when
   * the flag is off.
   */
  private _shouldSuppressAnonymousOp(op: Operation): boolean {
    if (!isIvCodePathEnabled()) return false;
    if (op instanceof LoginUserOperation || !op._requiresJwt) return false;
    if (!isIvBehaviorActive() || op._externalId) return false;

    // Bypasses Log so the developer sees this in production builds.
    console.warn(
      `OneSignal: ${op._name} was dropped. Identity Verification is on and no user is logged in. Call login(externalId, jwt) first.`,
    );
    return true;
  }

  /**
   * Removes every queued operation with no externalId that needs a JWT. These were
   * persisted while the requirement was off or unknown, and an anonymous user has
   * no JWT, so they can never pass the dispatch gate. An operation that needs no
   * JWT stays; the gate lets it through. Models are untouched; only operations go.
   * Surviving LoginUserOperations lose existingOnesignalId because the anonymous
   * login that would have resolved a local id is gone.
   */
  private _purgeAnonymousOperations(): void {
    const total = this._queue.length;
    const isPurged = (op: Operation) => !op._externalId && op._requiresJwt;
    const removed = this._queue.filter((item) => isPurged(item.operation));
    this._queue = this._queue.filter((item) => !isPurged(item.operation));

    for (const item of removed) {
      this._operationModelStore._remove(item.operation._modelId);
      item.resolver?.(false, ExecutionResult._Suppressed);
    }

    for (const { operation } of this._queue) {
      if (operation instanceof LoginUserOperation && operation._existingOnesignalId) {
        Log._debug('OpRepo: purge cleared existingOnesignalId');
        operation._clearExistingOnesignalId();
      }
    }

    Log._debug(`OpRepo: purged ${removed.length}/${total} anonymous ops`);
  }

  private _internalEnqueue(
    queueItem: OperationQueueItem,
    addToStore: boolean,
    index?: number,
  ): void {
    const hasExisting = this._queue.some(
      (item) => item.operation._modelId === queueItem.operation._modelId,
    );
    if (hasExisting) {
      Log._debug(`OpRepo: duplicate modelId: ${queueItem.operation._modelId}`);
      return;
    }

    if (index !== undefined) {
      this._queue.splice(index, 0, queueItem);
    } else {
      this._queue.push(queueItem);
    }

    if (addToStore) {
      this._operationModelStore._add(queueItem.operation);
    }
  }

  private _processQueueForever(): void {
    this._enqueueIntoBucket++;
    let runningOps = false;

    this._timerID = setInterval(async () => {
      if (runningOps) return Log._debug('Ops in progress');

      const ops = this._getNextOps(this._executeBucket);

      if (ops) {
        runningOps = true;
        await this._executeOperations(ops);
        runningOps = false;
      } else {
        this._enqueueIntoBucket++;
      }
    }, OP_REPO_EXECUTION_INTERVAL);
  }

  public async _executeOperations(ops: OperationQueueItem[]): Promise<void> {
    try {
      const startingOp = ops[0];
      const executor = this._executorsMap.get(startingOp.operation._name);

      if (!executor) {
        throw new Error(`Could not find executor for operation ${startingOp.operation._name}`);
      }

      const operations = ops.map((op) => op.operation);
      // The token the request goes out with. A 401 must not invalidate a newer
      // token that login or updateUserJwt stored while the request was in flight.
      const externalId = startingOp.operation._externalId;
      const jwtAtDispatch = externalId ? this._jwtTokenStore._getJwt(externalId) : undefined;
      const response = await executor._execute(operations);
      const idTranslations = response._idTranslations;

      Log._debug(`OpRepo: result = ${response._result}`);

      // Handle ID translations
      if (idTranslations) {
        ops.forEach((op) => op.operation._translateIds(idTranslations));
        this._queue.forEach((item) => item.operation._translateIds(idTranslations));

        Object.values(idTranslations).forEach((id) => this._newRecordState._add(id));
      }

      let highestRetries = 0;
      switch (response._result) {
        case ExecutionResult._Success:
          // Remove operations from store
          ops.forEach((op) => {
            this._operationModelStore._remove(op.operation._modelId);
          });
          ops.forEach((op) => op.resolver?.(true));
          break;

        case ExecutionResult._FailUnauthorized:
          // Outer gate: the IV handler runs only on the new code path.
          if (
            isIvCodePathEnabled() &&
            this._handleFailUnauthorized(ops, isIvBehaviorActive(), jwtAtDispatch)
          ) {
            break;
          }
          // IV inactive or an anonymous operation: drop, the same as FailNoretry.
          this._dropAndWake(ops, operations, response._result);
          break;

        case ExecutionResult._FailNoretry:
        case ExecutionResult._FailConflict:
          this._dropAndWake(ops, operations, response._result);
          break;

        case ExecutionResult._SuccessStartingOnly:
          // Remove starting operation and re-add others to the queue
          this._operationModelStore._remove(startingOp.operation._modelId);

          startingOp.resolver?.(true);
          ops
            .filter((op) => op !== startingOp)
            .reverse()
            .forEach((op) => this._queue.unshift(op));
          break;

        case ExecutionResult._FailRetry:
          Log._error(`Op failed, retrying: ${JSON.stringify(operations)}`);
          // Add back all operations to front of queue
          [...ops].reverse().forEach((op) => {
            removeOpFromDB(op.operation);
            op.retries++;
            if (op.retries > highestRetries) {
              highestRetries = op.retries;
            }
            this._queue.unshift(op);
          });
          break;

        case ExecutionResult._FailPauseOpRepo:
          Log._error(`Op failed, pausing: ${JSON.stringify(operations)}`);
          this._pause();
          ops.forEach((op) => op.resolver?.(false, response._result));
          [...ops].reverse().forEach((op) => {
            removeOpFromDB(op.operation);
            this._queue.unshift(op);
          });
          break;
      }

      // Handle additional operations from the response
      if (response._operations) {
        for (const op of [...response._operations].reverse()) {
          const queueItem = {
            operation: op,
            bucket: 0,
            retries: 0,
          };
          this._queue.unshift(queueItem);
          this._operationModelStore._addAt(0, queueItem.operation);
        }
      }

      // Wait before next execution
      await this._delayBeforeNextExecution(highestRetries, response._retryAfterSeconds);
      if (response._idTranslations) {
        await delay(OP_REPO_POST_CREATE_DELAY);
      }
    } catch (e) {
      Log._error(`Op execute error: ${JSON.stringify(ops)}`, e);

      // On failure remove operations from store
      ops.forEach((op) => {
        this._operationModelStore._remove(op.operation._modelId);
      });
      ops.forEach((op) => op.resolver?.(false, ExecutionResult._FailNoretry));
    }
  }

  private _dropAndWake(
    ops: OperationQueueItem[],
    operations: Operation[],
    result: ExecutionResultValue,
  ): void {
    Log._error(`Op failed (no retry): ${JSON.stringify(operations)}`);
    ops.forEach((op) => {
      this._operationModelStore._remove(op.operation._modelId);
    });
    ops.forEach((op) => op.resolver?.(false, result));
  }

  /**
   * Handles a 401 while IV behavior is active. Removes the token the request went
   * out with, which fires userJwtInvalidated so the app can supply a fresh one,
   * wakes the waiters, and re-queues the operations at the head with no resolver.
   * The dispatch gate then holds them until a new token is stored, so there is no
   * retry loop. If a newer token is already stored, it is kept and the re-queued
   * operations retry with it. Returns false when IV is inactive, the operation
   * is anonymous, or the operation sent no token (a 401 on an unsigned request
   * says nothing about the stored token); the caller then drops the operations.
   */
  private _handleFailUnauthorized(
    ops: OperationQueueItem[],
    ivBehaviorActive: boolean,
    jwtAtDispatch: string | undefined,
  ): boolean {
    if (!ivBehaviorActive) return false;
    const { _externalId: externalId, _requiresJwt: requiresJwt } = ops[0].operation;
    if (!externalId || !requiresJwt) return false;

    if (this._jwtTokenStore._getJwt(externalId) === jwtAtDispatch) {
      this._jwtTokenStore._invalidateJwt(externalId);
      Log._debug('OpRepo: 401, JWT invalidated');
    } else {
      Log._debug('OpRepo: 401, newer JWT kept');
    }

    ops.forEach((op) => op.resolver?.(false, ExecutionResult._FailUnauthorized));
    [...ops].reverse().forEach((op) => {
      this._queue.unshift({ operation: op.operation, bucket: op.bucket, retries: op.retries });
    });
    return true;
  }

  public async _delayBeforeNextExecution(
    retries: number,
    retryAfterSeconds?: number,
  ): Promise<void> {
    Log._debug(`retryAfterSeconds: ${retryAfterSeconds}`);
    const retryAfterSecondsMs = (retryAfterSeconds || 0) * 1000;
    const delayForOnRetries = retries * OP_REPO_DEFAULT_FAIL_RETRY_BACKOFF;
    const delayFor = Math.max(delayForOnRetries, retryAfterSecondsMs);

    if (delayFor < 1) return;

    Log._error(`Ops delayed: ${delayFor}ms`);
    await delay(delayFor);
  }

  public _getNextOps(bucketFilter: number): OperationQueueItem[] | null {
    if (!this._queue.length) return null;

    // Until the requirement is known, an unsigned request could reach an app that
    // needs a JWT. Operations stay queued; the next tick re-reads the requirement.
    // On the page, init awaits the config before the repo starts, so this guard
    // makes the deferral explicit instead of implicit in init order.
    if (isJwtRequirementUnknown()) {
      // Logged once so a queue stalled on a localStorage that does not read back is diagnosable.
      if (!this._loggedUnknownDeferral) {
        this._loggedUnknownDeferral = true;
        Log._debug('OpRepo: JWT requirement unknown');
      }
      return null;
    }
    this._loggedUnknownDeferral = false;

    // Snapshot both gates once per pass so every queue item sees the same IV view.
    const ivCodePathEnabled = isIvCodePathEnabled();
    const ivBehaviorActive = isIvBehaviorActive();

    const startingOpIndex = this._queue.findIndex(
      (item) =>
        item.operation._canStartExecute &&
        this._newRecordState._canAccess(item.operation._applyToRecordId) &&
        item.bucket <= bucketFilter &&
        (!ivCodePathEnabled || this._hasValidJwtIfRequired(item.operation, ivBehaviorActive)),
    );

    if (startingOpIndex !== -1) {
      const startingOp = this._queue[startingOpIndex];
      this._queue.splice(startingOpIndex, 1);
      return this._getGroupableOperations(startingOp);
    }

    return null;
  }

  /**
   * Whether the operation may dispatch under the current IV state. A blocked operation
   * is skipped, not dropped; it dispatches on a later pass once a token is stored.
   * The store re-reads on each pass, so a token stored by updateUserJwt or login,
   * or by another tab, is picked up on the next tick without a wake-up.
   */
  private _hasValidJwtIfRequired(op: Operation, ivBehaviorActive: boolean): boolean {
    if (!ivBehaviorActive || !op._requiresJwt) return true;
    const externalId = op._externalId;
    if (!externalId) return false;
    return this._jwtTokenStore._getJwt(externalId) !== undefined;
  }

  public _getGroupableOperations(startingOp: OperationQueueItem): OperationQueueItem[] {
    const ops = [startingOp];

    if (startingOp.operation._groupComparisonType === GroupComparisonType._None) return ops;

    const startingKey =
      startingOp.operation._groupComparisonType === GroupComparisonType._Create
        ? startingOp.operation._createComparisonKey
        : startingOp.operation._modifyComparisonKey;

    // Create a copy of queue to avoid modification during iteration
    const queueCopy = [...this._queue];

    for (const item of queueCopy) {
      const itemKey =
        startingOp.operation._groupComparisonType === GroupComparisonType._Create
          ? item.operation._createComparisonKey
          : item.operation._modifyComparisonKey;

      if (itemKey === '' && startingKey === '')
        throw new Error('Both comparison keys cannot be blank!');

      if (!this._newRecordState._canAccess(item.operation._applyToRecordId)) continue;

      if (itemKey === startingKey) {
        const index = this._queue.indexOf(item);
        if (index !== -1) {
          this._queue.splice(index, 1);
          ops.push(item);
        }
      }
    }

    return ops;
  }

  public async _loadSavedOperations(): Promise<void> {
    await this._operationModelStore._loadOperations();
    const operations = [...this._operationModelStore._list()].reverse();

    for (const operation of operations) {
      this._internalEnqueue(
        {
          operation,
          bucket: this._enqueueIntoBucket,
          retries: 0,
        },
        false,
        0,
      );
    }
  }
}
