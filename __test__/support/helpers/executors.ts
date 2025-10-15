import { GroupComparisonType, Operation } from 'src/core/operations/Operation';

export class SomeOperation extends Operation {
  constructor() {
    super('some-operation');
  }

  get _applyToRecordId() {
    return '';
  }

  get _createComparisonKey() {
    return '';
  }

  get _modifyComparisonKey() {
    return '';
  }

  get _groupComparisonType() {
    return GroupComparisonType.CREATE;
  }

  get _canStartExecute() {
    return true;
  }
}
