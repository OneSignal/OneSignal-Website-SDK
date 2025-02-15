import SdkEnvironment from '../../../src/shared/managers/SdkEnvironment';
import MainHelper from '../../../src/shared/helpers/MainHelper';
import Database from '../../../src/shared/services/Database';
import {
  DUMMY_PUSH_TOKEN,
  DUMMY_GET_USER_REQUEST_WITH_PUSH_SUB,
} from '../constants';
import { RequestService } from '../../../src/core/requestService/RequestService';
import { WindowEnvironmentKind } from '../../../src/shared/models/WindowEnvironmentKind';

export function setupLoginStubs() {
  vi.spyOn(RequestService, 'getUser').mockResolvedValue(
    DUMMY_GET_USER_REQUEST_WITH_PUSH_SUB,
  );
  vi.spyOn(SdkEnvironment, 'getWindowEnv').mockReturnValue(
    WindowEnvironmentKind.Host,
  );
  vi.spyOn(MainHelper, 'getCurrentPushToken').mockResolvedValue(
    DUMMY_PUSH_TOKEN,
  );
  vi.spyOn(Database.prototype, 'getSubscription').mockResolvedValue({
    optedOut: false,
    subscriptionToken: DUMMY_PUSH_TOKEN,
  });
}
