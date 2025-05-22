import { OP_REPO_EXECUTION_INTERVAL } from 'src/core/operationRepo/constants';
import { GroupComparisonType, Operation } from 'src/core/operations/Operation';
import { IRebuildUserService } from 'src/core/types/user';
import { delay } from 'src/shared/utils/utils';

export class SomeOperation extends Operation {
  constructor() {
    super('some-operation');
  }

  get applyToRecordId() {
    return '';
  }

  get createComparisonKey() {
    return '';
  }

  get modifyComparisonKey() {
    return '';
  }

  get groupComparisonType() {
    return GroupComparisonType.CREATE;
  }

  get canStartExecute() {
    return true;
  }
}

// TODO: Revisit after implementing BuildUserService
export const getRebuildOpsFn = vi.fn();
export class BuildUserService implements IRebuildUserService {
  getRebuildOperationsIfCurrentUser(...args: any[]) {
    return getRebuildOpsFn(...args);
  }
}

export const fakeWaitForOperations = async (amount = 2) => {
  await vi.advanceTimersByTimeAsync(OP_REPO_EXECUTION_INTERVAL * amount);
};
export const waitForOperations = async (amount = 2) => {
  await delay(OP_REPO_EXECUTION_INTERVAL * amount);
};
