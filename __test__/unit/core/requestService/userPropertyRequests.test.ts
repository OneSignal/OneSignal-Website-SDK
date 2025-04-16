import { LegacyOperation } from 'src/core/operationRepo/LegacyOperation';
import { ExecutorResultFailNotRetriable } from '../../../../src/core/executors/ExecutorResult';
import { OSModel } from '../../../../src/core/modelRepo/OSModel';
import { CoreChangeType } from '../../../../src/core/models/CoreChangeType';
import { ModelName } from '../../../../src/core/models/SupportedModels';
import { UserPropertiesModel } from '../../../../src/core/models/UserPropertiesModel';
import UserPropertyRequests from '../../../../src/core/requestService/UserPropertyRequests';
import Database from '../../../../src/shared/services/Database';

const getJWTTokenSpy = vi.spyOn(Database.prototype, 'getJWTToken');

describe('User Property Request tests', () => {
  beforeAll(() => {
    // Required for Operation class
    getJWTTokenSpy.mockResolvedValue([]);
  });

  test('updateUserProperties returns no retry failure result', async () => {
    const delta = {
      changeType: CoreChangeType.Update,
      model: new OSModel(ModelName.Properties, {}),
      property: 'tags',
      newValue: { key: 'value' },
    };
    const operation = new LegacyOperation<UserPropertiesModel>(
      CoreChangeType.Update,
      ModelName.Properties,
      [delta],
    );

    const result = await UserPropertyRequests.updateUserProperties(operation);

    expect(result).toStrictEqual(new ExecutorResultFailNotRetriable());
  });
});
