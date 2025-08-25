import { DEVICE_OS } from '__test__/constants';
import { generateNewSubscription } from '__test__/support/helpers/core';
import { SubscriptionModel } from 'src/core/models/SubscriptionModel';
import { SubscriptionType } from 'src/shared/subscriptions/constants';

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
    device_os: DEVICE_OS,
    device_model: '',
    sdk: __VERSION__,
  });

  const model = new SubscriptionModel();
  model.setProperty('type', SubscriptionType.Email);
  model.setProperty('id', '123');
  model.setProperty('token', 'myToken');

  expect(model.toJSON()).toEqual({
    type: SubscriptionType.Email,
    id: '123',
    token: 'myToken',
    device_os: DEVICE_OS,
    device_model: '',
    sdk: __VERSION__,
  });
});
