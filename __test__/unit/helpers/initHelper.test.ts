import InitHelper from '../../../src/shared/helpers/InitHelper';
import { TestEnvironment } from '../../support/environment/TestEnvironment';
import { MessageChannel } from 'worker_threads';

vi.stubGlobal('MessageChannel', MessageChannel);

describe('InitHelper', () => {
  beforeEach(async () => {
    await TestEnvironment.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    const spy = vi
      .spyOn(InitHelper, 'processExpiringSubscriptions')
      .mockResolvedValue(false);
    await InitHelper.onSdkInitialized();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('onSdkInitialized: sends on session update only if both autoPrompt and autoResubscribe are false', async () => {
    const spy = vi
      .spyOn(OneSignal.context.updateManager, 'sendOnSessionUpdate')
      .mockResolvedValue(false);

    OneSignal.config.userConfig.promptOptions.autoPrompt = false;
    OneSignal.config.userConfig.autoResubscribe = false;

    await InitHelper.onSdkInitialized();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('onSdkInitialized: does not send on session update', async () => {
    const spy = vi
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
