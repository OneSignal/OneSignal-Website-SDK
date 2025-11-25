import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { setupLoadStylesheet } from '__test__/support/helpers/setup';
import {
  CUSTOM_LINK_CSS_CLASSES,
  CUSTOM_LINK_CSS_SELECTORS,
} from 'src/shared/slidedown/constants';
import { expect, vi } from 'vitest';
import { ResourceLoadState } from '../../page/services/DynamicResourceLoader';
import { CustomLinkManager } from './CustomLinkManager';

describe('CustomLinkManager', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
    document.body.innerHTML = `
      <div class="${CUSTOM_LINK_CSS_SELECTORS._ContainerSelector.replace('.', '')}"></div>
    `;
  });

  test('_initialize returns when disabled or stylesheet fails', async () => {
    const mgrDisabled = new CustomLinkManager({ enabled: false });
    await expect(mgrDisabled._initialize()).resolves.toBeUndefined();

    // Stylesheet not loaded
    const mgr = new CustomLinkManager({
      enabled: true,
      text: { explanation: 'x', subscribe: 'Sub' },
    });
    const loadSdkStylesheetSpy = vi
      .spyOn(OneSignal._context._dynamicResourceLoader, '_loadSdkStylesheet')
      .mockResolvedValue(ResourceLoadState._Failed);
    await mgr._initialize();
    // nothing injected
    const containers = document.querySelectorAll(
      CUSTOM_LINK_CSS_SELECTORS._ContainerSelector,
    );
    expect(containers.length).toBe(1);
    expect(containers[0].children.length).toBe(0);
  });

  test('_initialize hides containers when subscribed and unsubscribe disabled', async () => {
    await setupLoadStylesheet();
    vi.spyOn(
      OneSignal._context._subscriptionManager,
      '_isPushNotificationsEnabled',
    ).mockResolvedValue(true);
    const mgr = new CustomLinkManager({
      enabled: true,
      unsubscribeEnabled: false,
      text: {
        explanation: 'hello',
        subscribe: 'Subscribe',
        unsubscribe: 'Unsubscribe',
      },
    });
    await mgr._initialize();
    const containers = document.querySelectorAll<HTMLElement>(
      CUSTOM_LINK_CSS_SELECTORS._ContainerSelector,
    );
    expect(
      containers[0].classList.contains(CUSTOM_LINK_CSS_CLASSES._Hide),
    ).toBe(true);
  });

  test('_initialize injects markup and click toggles subscription', async () => {
    await setupLoadStylesheet();
    vi.spyOn(
      OneSignal._context._subscriptionManager,
      '_isPushNotificationsEnabled',
    ).mockResolvedValue(false);
    const optInSpy = vi
      .spyOn(OneSignal.User.PushSubscription, 'optIn')
      .mockResolvedValue();
    const optOutSpy = vi
      .spyOn(OneSignal.User.PushSubscription, 'optOut')
      .mockResolvedValue();
    const mgr = new CustomLinkManager({
      enabled: true,
      unsubscribeEnabled: true,
      text: {
        explanation: 'hello',
        subscribe: 'Subscribe',
        unsubscribe: 'Unsubscribe',
      },
      style: 'button',
      size: 'medium',
      color: { text: '#fff', button: '#000' },
    });
    await mgr._initialize();
    const button = document.querySelector<HTMLButtonElement>(
      `.${CUSTOM_LINK_CSS_CLASSES._SubscribeClass}`,
    );
    expect(button).not.toBeNull();
    expect(button?.textContent).toBe('Subscribe');

    await button?.click();
    expect(optInSpy).toHaveBeenCalled();

    // simulate subscribed now (set optedIn getter)
    vi.spyOn(OneSignal.User.PushSubscription, 'optedIn', 'get').mockReturnValue(
      true,
    );
    await button?.click();
    expect(optOutSpy).toHaveBeenCalled();
  });
});
