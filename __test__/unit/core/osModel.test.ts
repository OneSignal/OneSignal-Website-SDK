import { OSModel } from '../../../src/core/modelRepo/OSModel';
import {
  SubscriptionModel,
  SubscriptionType,
} from '../../../src/core/models/SubscriptionModels';
import { ModelName } from '../../../src/core/models/SupportedModels';
import { generateNewSubscription } from '../../support/helpers/core';

describe('OSModel tests', () => {
  test('Set function updates data', async () => {
    const newSub = generateNewSubscription();
    expect(newSub.data?.enabled).toBe(undefined);
    newSub.set('enabled', true);
    expect(newSub.data?.enabled).toBe(true);
  });

  test('Set function broadcasts update event', async () => {
    const newSub = generateNewSubscription();
    newSub.subscribe(() => {
      expect(true).toBe(true);
    });
    newSub.set('enabled', true);
  });

  test('Hydrate function updates data', async () => {
    const newSub = generateNewSubscription();
    expect(newSub.data?.type).toBe(SubscriptionType.Email);
    newSub.hydrate({ type: SubscriptionType.ChromePush });
    expect(newSub.data?.type).toBe(SubscriptionType.ChromePush);
    expect(newSub.data).toEqual({ type: SubscriptionType.ChromePush });
  });

  test('Encode function returns encoded model', async () => {
    const newSub = generateNewSubscription();
    const encodedSub = newSub.encode();
    expect(encodedSub).toEqual({
      modelId: '0000000000',
      modelName: ModelName.Subscriptions,
      type: SubscriptionType.Email,
      id: '123',
      token: 'myToken',
    });
  });

  test('Decode function returns decoded model', async () => {
    const encodedSub = {
      modelId: '0000000000',
      modelName: ModelName.Subscriptions,
      type: SubscriptionType.Email,
      id: '123',
      token: 'myToken',
    };
    const decodedSub = OSModel.decode(encodedSub) as OSModel<SubscriptionModel>;

    const model: SubscriptionModel = {
      type: SubscriptionType.Email,
      id: '123',
      token: 'myToken',
    };

    // upstream bug workaround https://github.com/facebook/jest/issues/8475
    expect(JSON.stringify(decodedSub)).toEqual(
      JSON.stringify(new OSModel(ModelName.Subscriptions, model, '0000000000')),
    );
  });
});
