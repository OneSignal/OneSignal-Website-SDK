import {
  ExecutionResult,
  type IOperationExecutor,
  type IOperationRepo,
  type ExecutionResultValue,
  type IStartableService,
} from 'src/core/types/operation';
import { db } from 'src/shared/database/client';
import { OperationFailedError, RetryLimitError } from 'src/shared/errors/common';
import { delay } from 'src/shared/helpers/general';
import Log from 'src/shared/libraries/Log';
import { IDManager } from 'src/shared/managers/IDManager';

import {
  isIvBehaviorActive,
  isIvCodePathEnabled,
  isJwtRequirementUnknown,
} from '../identityVerification';
import { type JwtTokenStore } from '../JwtTokenStore';
import { SubscriptionModelStoreListener } from '../listeners/SubscriptionModelStoreListener';
import { type OperationModelStore } from '../modelRepo/OperationModelStore';
import { type IdentityModelStore } from '../modelStores/IdentityModelStore';
import { type SubscriptionModelStore } from '../modelStores/SubscriptionModelStore';
import { BaseSubscriptionOperation } from '../operations/BaseSubscriptionOperation';
import { CreateSubscriptionOperation } from '../operations/CreateSubscriptionOperation';
import { LoginUserOperation } from '../operations/LoginUserOperation';
import { GroupComparisonType, type Operation } from '../operations/Operation';
import { TransferSubscriptionOperation } from '../operations/TransferSubscriptionOperation';
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
  /** The batch that waits for its executor. These ops are not in `_queue` during that time. */
  public _inFlightOps: OperationQueueItem[] = [];
  public _timerID: NodeJS.Timeout | undefined = undefined;
  private _enqueueIntoBucket = 0;
  private _operationModelStore: OperationModelStore;
  private _newRecordState: NewRecordsState;
  private _jwtTokenStore: JwtTokenStore;
  private _identityModelStore: IdentityModelStore;
  private _subscriptionModelStore: SubscriptionModelStore;
  private _loggedUnknownDeferral = false;

  constructor(
    executors: IOperationExecutor[],
    operationModelStore: OperationModelStore,
    newRecordState: NewRecordsState,
    jwtTokenStore: JwtTokenStore,
    identityModelStore: IdentityModelStore,
    subscriptionModelStore: SubscriptionModelStore,
  ) {
    this._operationModelStore = operationModelStore;
    this._newRecordState = newRecordState;
    this._jwtTokenStore = jwtTokenStore;
    this._identityModelStore = identityModelStore;
    this._subscriptionModelStore = subscriptionModelStore;

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
    await Promise.all([
      this._loadSavedOperations(),
      this._identityModelStore._loaded,
      this._subscriptionModelStore._loaded,
    ]);
    // The page fetches the config before the repo starts, so the requirement is
    // already hydrated here. This is the web equivalent of Android's hydrate hook.
    if (isIvBehaviorActive()) {
      this._purgeAnonymousOperations();
      this._removeOpsWithNoJwt();
    }
    this._removeUntranslatableOps(true);
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
   * Enqueues the operation just ahead of `before`, in the same bucket, so the
   * queue cannot start `before` first. Appends if `before` is not in the queue.
   */
  public _enqueueBefore(operation: Operation, before: Operation): void {
    const index = this._queue.findIndex((item) => item.operation === before);
    if (index === -1) return this._enqueue(operation);
    if (this._shouldSuppressAnonymousOp(operation)) return;
    Log._debug(`OpRepo.enqueueBefore: ${JSON.stringify(operation)}`);

    this._internalEnqueue(
      {
        operation,
        bucket: this._queue[index].bucket,
        retries: 0,
      },
      true,
      index,
    );
  }

  /** Removes every queued operation that matches, and rejects its waiter. Returns the count. */
  public _removeQueued(matches: (operation: Operation) => boolean): number {
    const removed = this._queue.filter((item) => matches(item.operation));
    if (!removed.length) return 0;
    this._queue = this._queue.filter((item) => !removed.includes(item));
    removed.forEach((item) => {
      this._operationModelStore._remove(item.operation._modelId);
      item.resolver?.(false, ExecutionResult._FailNoretry);
    });
    Log._debug(`OpRepo: removed ${removed.length} queued ops`);
    return removed.length;
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
   * holding it forever. An anonymous LoginUserOperation is dropped with no
   * warning: the push grant, addEmail, and addSms enqueue it together with a
   * subscription operation, and the drop of that operation warns. An
   * operation that needs no JWT is exempt; the gate lets it through, unless
   * its user has a local id: no anonymous login runs under IV, so that id is never
   * translated and the operation would wait forever.
   * Outer gate isIvCodePathEnabled keeps the legacy enqueue path unchanged when
   * the flag is off.
   */
  private _shouldSuppressAnonymousOp(op: Operation): boolean {
    if (!isIvCodePathEnabled()) return false;
    if (!isIvBehaviorActive() || op._externalId) return false;
    if (op instanceof LoginUserOperation) return true;
    if (!op._requiresJwt && !IDManager._isLocalId(op._onesignalId)) return false;

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
   * JWT stays; the gate lets it through, unless its user has a local id that no
   * login will translate. Models are untouched; only operations go.
   * Surviving LoginUserOperations lose existingOnesignalId because the anonymous
   * login that would have resolved a local id is gone.
   */
  private _purgeAnonymousOperations(): void {
    const total = this._queue.length;
    const isPurged = (op: Operation) =>
      !op._externalId && (op._requiresJwt || IDManager._isLocalId(op._onesignalId));
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

  /**
   * Removes the operations of an earlier user that has no token. The SDK asks
   * the app for a token only when a 401 removes one, so after a reload no
   * token for that user comes. The current user keeps its operations, because
   * the app gives its token with login or updateUserJwt.
   */
  private _removeOpsWithNoJwt(): void {
    const currentExternalId = this._identityModelStore._model._externalId;
    this._removeQueued((op) => {
      const externalId = op._externalId;
      return (
        !!externalId &&
        externalId !== currentExternalId &&
        op._requiresJwt &&
        !this._jwtTokenStore._getJwt(externalId)
      );
    });
  }

  /**
   * A local id gets its server id only from a queued login-user or
   * create-subscription operation. A queued login-user also sends the
   * subscription operations of its user, and it can create a local subscription
   * from a transfer, so those operations stay. If that operation was
   * dropped, the operations that wait for the id can never start, so they are removed.
   * The current user keeps its operations: a later call can still enqueue its
   * login. While its id is local, it also keeps its subscription operations,
   * because that login sends them. At start, a current user with an externalId gets a new login, because
   * login with the same externalId does nothing. The login is enqueued before the
   * removal, so the subscription operations that it sends stay.
   * A removed create-subscription goes to the current user again, see
   * _recreateSubscriptions.
   */
  private _removeUntranslatableOps(atStart: boolean): void {
    const { _onesignalId: currentId, _externalId: externalId } = this._identityModelStore._model;
    const findCreated = () =>
      new Set<string | undefined>(
        this._queue.map(({ operation: op }) =>
          op instanceof LoginUserOperation
            ? op._onesignalId
            : op instanceof CreateSubscriptionOperation
              ? op._subscriptionId
              : '',
        ),
      );
    let created = findCreated();
    const isLost = (id?: string) => IDManager._isLocalId(id) && !created.has(id);

    const waiting = this._queue.find(({ operation }) => operation._onesignalId === currentId);
    if (atStart && waiting && externalId && isLost(currentId)) {
      this._enqueue(
        new LoginUserOperation({
          appId: waiting.operation._appId,
          onesignalId: currentId,
          externalId,
        }),
      );
    }

    const removedCreates: CreateSubscriptionOperation[] = [];
    do {
      created = findCreated();
    } while (
      this._removeQueued((op) => {
        if (op instanceof LoginUserOperation) {
          if (isLost(op._existingOnesignalId)) op._clearExistingOnesignalId();
          return false;
        }
        const isRemoved =
          (op._onesignalId !== currentId && isLost(op._onesignalId)) ||
          (op instanceof BaseSubscriptionOperation &&
            !(op instanceof CreateSubscriptionOperation) &&
            !created.has(op._onesignalId) &&
            !(op._onesignalId === currentId && IDManager._isLocalId(currentId)) &&
            isLost(op._subscriptionId));
        if (isRemoved && op instanceof CreateSubscriptionOperation) removedCreates.push(op);
        return isRemoved;
      })
    );
    this._recreateSubscriptions(removedCreates);
  }

  /**
   * Subscription models stay after a user switch, so the model of a removed
   * create keeps its local id. A later addEmail or addSms with the same token
   * does nothing, so no other code creates the subscription. Enqueues a create
   * for the current user from the model. Skips a subscription that a queued
   * create or transfer still sends, and a model that is gone.
   */
  private _recreateSubscriptions(removedCreates: CreateSubscriptionOperation[]): void {
    const { _onesignalId: onesignalId, _externalId: externalId } = this._identityModelStore._model;
    removedCreates.forEach(({ _appId: appId, _subscriptionId: subscriptionId }) => {
      const model = this._subscriptionModelStore._getBySubscriptionId(subscriptionId);
      const isSent = this._queue.some(
        ({ operation: op }) =>
          (op instanceof CreateSubscriptionOperation ||
            op instanceof TransferSubscriptionOperation) &&
          op._subscriptionId === subscriptionId,
      );
      if (model && !isSent) {
        this._enqueue(
          new CreateSubscriptionOperation({
            appId,
            onesignalId,
            externalId,
            subscriptionId,
            type: model.type,
            token: model.token,
            ...SubscriptionModelStoreListener._getSubscriptionEnabledAndStatus(model),
          }),
        );
      }
    });
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
      this._inFlightOps = ops;
      const response = await executor._execute(operations).finally(() => (this._inFlightOps = []));
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
          this._removeOpsOfRejectedLogins(operations);
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
      // No response from the server while offline, so keep the operations and send them later.
      if (e === RetryLimitError && !navigator.onLine) {
        [...ops].reverse().forEach((op) => {
          op.retries++;
          this._queue.unshift(op);
        });
        return this._delayBeforeNextExecution(ops[0].retries);
      }

      Log._error(`Op execute error: ${JSON.stringify(ops)}`, e);
      ops.forEach((op) => op.resolver?.(false, ExecutionResult._FailNoretry));

      // Online, a request that gets no answer can be blocked (CSP, firewall). The waiters
      // already rejected, and the operations stay queued, so login() does not stay pending.
      if (e === RetryLimitError) {
        [...ops].reverse().forEach((op) => {
          op.retries++;
          op.resolver = undefined;
          this._queue.unshift(op);
        });
        return this._delayBeforeNextExecution(ops[0].retries);
      }

      // On failure remove operations from store
      ops.forEach((op) => {
        this._operationModelStore._remove(op.operation._modelId);
      });
      this._removeUntranslatableOps(false);
    }
  }

  /** The server rejected the user, so a new login at start would fail the same way. */
  private _removeOpsOfRejectedLogins(operations: Operation[]): void {
    operations.forEach((op) => {
      if (op instanceof LoginUserOperation && IDManager._isLocalId(op._onesignalId))
        this._removeQueued((queued) => queued._onesignalId === op._onesignalId);
    });
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
    this._removeOpsOfRejectedLogins(operations);
    this._removeUntranslatableOps(false);
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
    if (!navigator.onLine) return null;

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
