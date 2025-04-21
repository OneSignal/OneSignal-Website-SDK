import { PropertiesObject } from 'src/core/objects/PropertiesObject';
import { DeleteTagOperation } from 'src/core/operations/DeleteTagOperation';
import { Operation } from 'src/core/operations/Operation';
import { SetPropertyOperation } from 'src/core/operations/SetPropertyOperation';
import { SetTagOperation } from 'src/core/operations/SetTagOperation';

export class PropertyOperationHelper {
  static createPropertiesFromOperation(
    operation:
      | SetTagOperation
      | DeleteTagOperation
      | SetPropertyOperation
      | Operation,
    properties: PropertiesObject,
  ): PropertiesObject {
    const tags = { ...(properties.tags ?? {}) };

    if (operation instanceof SetTagOperation) {
      tags[operation.key] = operation.value;
      return new PropertiesObject({
        ...properties,
        tags,
      });
    }

    if (operation instanceof DeleteTagOperation) {
      delete tags[operation.key];
      return new PropertiesObject({
        ...properties,
        tags,
      });
    }

    if (operation instanceof SetPropertyOperation) {
      switch (operation.property) {
        case 'language':
          return new PropertiesObject({
            ...properties,
            language: operation.value as string,
          });
        case 'timezone':
          return new PropertiesObject({
            ...properties,
            timezoneId: operation.value as string,
          });
        case 'country':
          return new PropertiesObject({
            ...properties,
            country: operation.value as string,
          });
        case 'locationLatitude':
          return new PropertiesObject({
            ...properties,
            latitude: operation.value as number,
          });
        case 'locationLongitude':
          return new PropertiesObject({
            ...properties,
            longitude: operation.value as number,
          });
        default:
          return new PropertiesObject({
            ...properties,
          });
      }
    }

    throw new Error(`Unsupported operation type: ${operation.name}`);
  }
}
