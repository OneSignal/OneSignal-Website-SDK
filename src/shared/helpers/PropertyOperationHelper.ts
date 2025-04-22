import { PropertiesObject } from 'src/core/objects/PropertiesObject';
import { DeleteTagOperation } from 'src/core/operations/DeleteTagOperation';
import { Operation } from 'src/core/operations/Operation';
import { SetPropertyOperation } from 'src/core/operations/SetPropertyOperation';
import { SetTagOperation } from 'src/core/operations/SetTagOperation';

export class PropertyOperationHelper {
  static createPropertiesFromOperation(
    operation: Operation,
    properties: PropertiesObject,
  ): PropertiesObject {
    if (
      operation instanceof SetTagOperation ||
      operation instanceof DeleteTagOperation
    ) {
      const tags = { ...(properties.tags ?? {}) };

      if (operation instanceof SetTagOperation)
        tags[operation.key] = operation.value;
      else delete tags[operation.key];

      return new PropertiesObject({ ...properties, tags });
    }

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

    throw new Error(`Unsupported operation type: ${operation.name}`);
  }
}
