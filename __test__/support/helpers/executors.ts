import { GroupComparisonType, Operation } from 'src/core/operations/Operation';

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
