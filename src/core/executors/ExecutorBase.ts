import Log from '../../shared/libraries/Log';
import Database from '../../shared/services/Database';
import LocalStorage from '../../shared/utils/LocalStorage';
import { logMethodCall } from '../../shared/utils/utils';
import OperationCache from '../caching/OperationCache';
import { CoreChangeType } from '../models/CoreChangeType';
import { CoreDelta } from '../models/CoreDeltas';
import { ExecutorConfig } from '../models/ExecutorConfig';
import { SupportedModel } from '../models/SupportedModels';
import { NewRecordsState } from '../operationRepo/NewRecordsState';
import { Operation } from '../operations/Operation';
import { ExecutorResult } from './ExecutorResult';

const RETRY_AFTER = 5_000;

// TODO: Remove this with later Web SDK Prs
export default abstract class ExecutorBase {
  protected _deltaQueue: CoreDelta<SupportedModel>[] = [];
  protected _operationQueue: Operation<SupportedModel>[] = [];
  protected _newRecordsState: NewRecordsState;

  protected _executeAdd?: (
    operation: Operation<SupportedModel>,
  ) => Promise<ExecutorResult<SupportedModel>>;
  protected _executeUpdate?: (
    operation: Operation<SupportedModel>,
  ) => Promise<ExecutorResult<SupportedModel>>;
  protected _executeRemove?: (
    operation: Operation<SupportedModel>,
  ) => Promise<ExecutorResult<SupportedModel>>;

  private onlineStatus = true;

  static OPERATIONS_BATCH_PROCESSING_TIME = 5;
  static RETRY_COUNT = 5;

  constructor(
    executorConfig: ExecutorConfig<SupportedModel>,
    newRecordsState: NewRecordsState,
  ) {
    setInterval(() => {
      Log.debug('OneSignal: checking for operations to process from cache');
      const cachedOperations = this.getOperationsFromCache();
      this._operationQueue = [...cachedOperations, ...this._operationQueue];

      if (this._operationQueue.length > 0) {
        this._processOperationQueue.call(this);
      }
    }, ExecutorBase.OPERATIONS_BATCH_PROCESSING_TIME * 1_000);

    window.addEventListener('online', this._onNetworkChange.bind(this, true));
    window.addEventListener('offline', this._onNetworkChange.bind(this, false));

    this._executeAdd = executorConfig.add;
    this._executeUpdate = executorConfig.update;
    this._executeRemove = executorConfig.remove;

    this._newRecordsState = newRecordsState;
  }

  abstract processDeltaQueue(): void;
  abstract getOperationsFromCache(): Operation<SupportedModel>[];

  public enqueueDelta(delta: CoreDelta<SupportedModel>): void {
    logMethodCall('ExecutorBase.enqueueDelta', { delta });
    /**
     * deep copy (snapshot)
     * if we add alias and then login to a user, we want to ensure that the external id of the
     * login call doesn't get included in the add alias call so this helps keep the changes separate
     */
    const deltaCopy = JSON.parse(JSON.stringify(delta));
    this._deltaQueue.push(deltaCopy);
  }

  public get deltaQueue(): CoreDelta<SupportedModel>[] {
    return this._deltaQueue;
  }

  public get operationQueue(): Operation<SupportedModel>[] {
    return this._operationQueue;
  }

  protected _enqueueOperation(operation: Operation<SupportedModel>): void {
    logMethodCall('ExecutorBase.enqueueOperation', { operation });
    this._operationQueue.push(operation);
  }

  protected _flushDeltas(): void {
    this._deltaQueue = [];
  }

  protected _flushOperations(): void {
    logMethodCall('ExecutorBase._flushOperations');
    this._operationQueue = [];
  }

  protected _getChangeType(
    oldValue: unknown,
    newValue: unknown,
  ): CoreChangeType {
    logMethodCall('ExecutorBase._getChangeType', { oldValue, newValue });
    const wasPropertyAdded = !oldValue && !!newValue;
    const wasPropertyRemoved = !!oldValue && !newValue;
    const wasPropertyUpdated =
      oldValue !== newValue && !!newValue && !!oldValue;

    let finalChangeType;

    if (wasPropertyAdded) {
      finalChangeType = CoreChangeType.Add;
    } else if (wasPropertyRemoved) {
      finalChangeType = CoreChangeType.Remove;
    } else if (wasPropertyUpdated) {
      finalChangeType = CoreChangeType.Update;
    } else {
      throw new Error('Unsupported change type');
    }

    return finalChangeType;
  }

  protected async _processOperationQueue(): Promise<void> {
    const consentRequired =
      OneSignal.config.userConfig.requiresUserPrivacyConsent ||
      LocalStorage.getConsentRequired();
    const consentGiven = await Database.getConsentGiven();

    if (consentRequired && !consentGiven) {
      return;
    }

    while (this._operationQueue.length > 0) {
      const operation = this._operationQueue.shift();

      if (operation) {
        OperationCache.enqueue(operation);

        if (this._canExecute(operation)) {
          this._processOperation(operation, ExecutorBase.RETRY_COUNT).catch(
            (err) => {
              Log.error(err);
            },
          );
        }
      }
    }
  }

  private async _processOperation(
    operation: Operation<SupportedModel>,
    retries: number,
  ): Promise<void> {
    logMethodCall('ExecutorBase._processOperation', { operation, retries });

    // TO DO: fix optional model object. should always be defined on operation
    await operation.model?.awaitOneSignalIdAvailable;
    await operation.jwtTokenAvailable;

    let res: ExecutorResult<SupportedModel> = {
      success: false,
      retriable: true,
    };

    if (operation?.changeType === CoreChangeType.Add) {
      res = await this._executeAdd?.call(this, operation);
    } else if (operation?.changeType === CoreChangeType.Remove) {
      res = await this._executeRemove?.call(this, operation);
    } else if (operation?.changeType === CoreChangeType.Update) {
      res = await this._executeUpdate?.call(this, operation);
    }
    // HYDRATE
    if (res.success) {
      if (res.result) {
        // since we took a snapshot of the operation, we get a new instance with the correct model reference
        const operationInstance =
          await Operation.getInstanceWithModelReference(operation);
        operationInstance?.model?.hydrate(res.result as SupportedModel);
      }
      OperationCache.delete(operation?.operationId);
    } else {
      if (res.retriable && retries > 0) {
        setTimeout(() => {
          this._processOperation(operation, retries - 1).catch((err) => {
            Log.error(err);
          });
        }, RETRY_AFTER);
      } else {
        OperationCache.delete(operation?.operationId);
      }
    }
  }

  private _onNetworkChange(online: boolean): void {
    logMethodCall('ExecutorBase._onNetworkChange', { online });
    this.onlineStatus = online;

    if (online) {
      this._processOperationQueue.call(this);
    }
  }

  private _canExecute(operation: Operation<SupportedModel>): boolean {
    if (!this.onlineStatus) {
      return false;
    }

    if (operation.applyToRecordId) {
      if (!this._newRecordsState.canAccess(operation.applyToRecordId)) {
        return false;
      }
    }

    return true;
  }
}
