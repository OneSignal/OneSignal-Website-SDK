import { Operation } from 'src/core/operations/Operation';
import { SetPropertyOperation } from 'src/core/operations/SetPropertyOperation';
import type { IUserProperties } from 'src/core/types/api';

export class PropertyOperationHelper {
  static createPropertiesFromOperation(
    operation: Operation,
    properties: IUserProperties,
  ): IUserProperties {
    if (operation instanceof SetPropertyOperation) {
      const propertyKey = operation.property;
      return {
        ...properties,
        [propertyKey]: operation.value,
      };
    }

    throw new Error(`Unsupported operation type:${operation.name}`);
  }
}
