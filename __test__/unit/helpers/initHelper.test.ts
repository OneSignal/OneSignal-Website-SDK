import InitHelper from '../../../src/shared/helpers/InitHelper';
import { TestEnvironment } from '../../support/environment/TestEnvironment';
import { MessageChannel } from 'worker_threads';

describe('InitHelper', () => {
  beforeEach(async () => {
    await TestEnvironment.initialize();
    (global as any).MessageChannel = MessageChannel;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /** onSdkInitialized */
  test('onSdkInitialized: ensure public sdk initialized triggered', async () => {
    OneSignal.emitter.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
      expect(true).toBe(true);
    });
    await InitHelper.onSdkInitialized();
    expect.assertions(1);
  });

  test('onSdkInitialized: processes expiring subscriptions', async () => {
    const spy = test.stub(
      InitHelper,
      'processExpiringSubscriptions',
      Promise.resolve(undefined),
    );
    await InitHelper.onSdkInitialized();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('onSdkInitialized: sends on session update only if both autoPrompt and autoResubscribe are false', async () => {
    const spy = jest
      .spyOn(OneSignal.context.updateManager, 'sendOnSessionUpdate')
      .mockResolvedValue(undefined);

    OneSignal.config.userConfig.promptOptions.autoPrompt = false;
    OneSignal.config.userConfig.autoResubscribe = false;

    await InitHelper.onSdkInitialized();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('onSdkInitialized: does not send on session update', async () => {
    const spy = jest
      .spyOn(OneSignal.context.updateManager, 'sendOnSessionUpdate')
      .mockResolvedValue(undefined);

    OneSignal.config.userConfig.promptOptions.autoPrompt = true;
    OneSignal.config.userConfig.autoResubscribe = true;

    await InitHelper.onSdkInitialized();

    expect(spy).not.toHaveBeenCalled();

    OneSignal.config.userConfig.promptOptions.autoPrompt = false;
    OneSignal.config.userConfig.autoResubscribe = true;

    await InitHelper.onSdkInitialized();

    expect(spy).not.toHaveBeenCalled();

    OneSignal.config.userConfig.promptOptions.autoPrompt = true;
    OneSignal.config.userConfig.autoResubscribe = false;

    await InitHelper.onSdkInitialized();

    expect(spy).not.toHaveBeenCalled();
  });
});
