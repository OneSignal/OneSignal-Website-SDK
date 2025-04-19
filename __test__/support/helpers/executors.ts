import { GroupComparisonType, Operation } from 'src/core/operations/Operation';
import { IPreferencesService } from 'src/core/types/preferences';
import { IRebuildUserService } from 'src/core/types/user';

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

export const getValueFn = vi.fn().mockReturnValue('{}');
export const setValueFn = vi.fn();
export class MockPreferencesService implements IPreferencesService {
  getValue(...args: any[]) {
    return getValueFn(...args);
  }
  setValue(...args: any[]) {
    return setValueFn(...args);
  }
}
