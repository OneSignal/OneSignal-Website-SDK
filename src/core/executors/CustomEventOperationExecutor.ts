import Environment from 'src/shared/helpers/Environment';
import {
  getResponseStatusType,
  ResponseStatusType,
} from 'src/shared/helpers/NetworkUtils';
import Log from 'src/shared/libraries/Log';
import { VERSION } from 'src/shared/utils/EnvVariables';
import { OPERATION_NAME } from '../constants';
import { ExecutionResponse } from '../operations/ExecutionResponse';
import { Operation } from '../operations/Operation';
import { TrackEventOperation } from '../operations/TrackEventOperation';
import { RequestService } from '../requestService/RequestService';
import type { ICustomEventMetadata } from '../types/customEvents';
import { ExecutionResult, type IOperationExecutor } from '../types/operation';

// Implements logic similar to Android SDK's CustomEventOperationExecutor
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/main/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/operations/impl/executors/CustomEventOperationExecutor.kt
export class CustomEventsOperationExecutor implements IOperationExecutor {
  constructor() {}

  get operations(): string[] {
    return [OPERATION_NAME.CUSTOM_EVENT];
  }

  private get eventMetadata(): ICustomEventMetadata {
    return {
      sdk: VERSION,
      device_model: Environment.getDeviceModel(),
      device_os: Environment.getDeviceOS(),
      type: Environment.getSubscriptionType(),
    };
  }

  async execute(operations: Operation[]): Promise<ExecutionResponse> {
    Log.debug(
      `CustomEventsOperationExecutor(operations: ${JSON.stringify(
        operations,
      )})`,
    );

    // TODO: each trackEvent is sent individually right now; may need to batch in the future
    const operation = operations[0];

    if (!(operation instanceof TrackEventOperation)) {
      throw new Error(
        `Unrecognized operation! Expected TrackEventOperation, got: ${operation.constructor.name}`,
      );
    }

    const response = await RequestService.sendCustomEvent(
      { appId: operation.appId },
      {
        name: operation.event.name,
        onesignal_id: operation.onesignalId,
        external_id: operation.externalId,
        timestamp: operation.timestamp,
        payload: {
          ...(operation.event.properties ?? {}),
          os_sdk: this.eventMetadata,
        },
      },
    );

    const { ok, status } = response;
    const responseType = getResponseStatusType(status);

    if (ok) return new ExecutionResponse(ExecutionResult.SUCCESS);

    switch (responseType) {
      case ResponseStatusType.RETRYABLE:
        return new ExecutionResponse(ExecutionResult.FAIL_RETRY);
      default:
        return new ExecutionResponse(ExecutionResult.FAIL_NORETRY);
    }
  }
}
