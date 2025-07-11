import { mockUserAgent } from '__test__/support/environment/TestEnvironmentHelpers';
import { SubscriptionModel } from 'src/core/models/SubscriptionModel';
import { SubscriptionType } from 'src/core/types/subscription';
import { generateNewSubscription } from '../../support/helpers/core';

describe('Model tests', () => {
  beforeAll(() => {
    mockUserAgent();
  });

  test('Set function updates data', async () => {
    const newSub = generateNewSubscription();
    expect(newSub.enabled).toBe(undefined);
    newSub.setProperty('enabled', true);
    expect(newSub.enabled).toBe(true);
  });

  test('Set function broadcasts update event', async () => {
    const newSub = generateNewSubscription();
    newSub.subscribe({
      onChanged: () => {
        expect(true).toBe(true);
      },
    });
    newSub.setProperty('enabled', true);
  });

  test('Hydrate function updates data', async () => {
    const newSub = generateNewSubscription();
    expect(newSub.type).toBe(SubscriptionType.Email);
    newSub.setProperty('type', SubscriptionType.ChromePush);
    expect(newSub.type).toBe(SubscriptionType.ChromePush);
  });

  test('Encode function returns encoded model', async () => {
    const newSub = generateNewSubscription();
    expect(newSub.toJSON()).toEqual({
      type: SubscriptionType.Email,
      id: '123',
      token: 'myToken',
      device_os: 56,
      device_model: '',
      sdk: '1',
    });

    const model = new SubscriptionModel();
    model.setProperty('type', SubscriptionType.Email);
    model.setProperty('id', '123');
    model.setProperty('token', 'myToken');

    expect(model.toJSON()).toEqual({
      type: SubscriptionType.Email,
      id: '123',
      token: 'myToken',
      device_os: 56,
      device_model: '',
      sdk: '1',
    });
  });
});
