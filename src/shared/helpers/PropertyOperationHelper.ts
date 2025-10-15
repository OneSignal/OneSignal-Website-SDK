import { PropertiesObject } from 'src/core/objects/PropertiesObject';
import { Operation } from 'src/core/operations/Operation';
import { SetPropertyOperation } from 'src/core/operations/SetPropertyOperation';

export class PropertyOperationHelper {
  static createPropertiesFromOperation(
    operation: Operation,
    properties: PropertiesObject,
  ): PropertiesObject {
    if (operation instanceof SetPropertyOperation) {
      const propertyKey = operation.property;
      const allowedKeys = Object.keys(properties);
      if (allowedKeys.includes(propertyKey)) {
        return new PropertiesObject({
          ...properties,
          [propertyKey]: operation.value,
        });
      }
      return new PropertiesObject({ ...properties });
    }

    throw new Error(`Unsupported operation type: ${operation._name}`);
  }
}
