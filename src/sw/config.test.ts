import { APP_ID } from '__test__/constants';
import TestContext from '__test__/support/environment/TestContext';
import { ConfigIntegrationKind } from 'src/shared/config/constants';
import { InvalidAppIdError } from 'src/shared/errors/common';
import type { ServerAppConfig } from 'src/shared/config/types';
import { getServerAppConfigSW } from './config';

function fakeDownload(serverConfig: ServerAppConfig) {
  return () => Promise.resolve(serverConfig);
}

describe('getServerAppConfigSW', () => {
  test('throws on missing appId', async () => {
    const dl = fakeDownload(
      TestContext.getFakeServerAppConfig(ConfigIntegrationKind._Custom),
    );
    await expect(getServerAppConfigSW('', dl)).rejects.toBe(InvalidAppIdError);
  });

  test('throws on invalid uuid appId', async () => {
    const dl = fakeDownload(
      TestContext.getFakeServerAppConfig(ConfigIntegrationKind._Custom),
    );
    await expect(getServerAppConfigSW('not-a-uuid', dl)).rejects.toBe(
      InvalidAppIdError,
    );
  });

  test('builds config from custom integration server response', async () => {
    const serverConfig = TestContext.getFakeServerAppConfig(
      ConfigIntegrationKind._Custom,
    );
    const config = await getServerAppConfigSW(
      serverConfig.app_id,
      fakeDownload(serverConfig),
    );

    expect(config.appId).toBe(serverConfig.app_id);
    expect(config.siteName).toBe(serverConfig.config.siteInfo.name);
    expect(config.origin).toBe(serverConfig.config.origin);
    expect(config.vapidPublicKey).toBe(serverConfig.config.vapid_public_key);
    expect(config.onesignalVapidPublicKey).toBe(
      serverConfig.config.onesignal_vapid_public_key,
    );
    expect(config.hasUnsupportedSubdomain).toBe(false);
    expect(config.restrictedOriginEnabled).toBeUndefined();
  });

  test('session fields use server values when present', async () => {
    const serverConfig = TestContext.getFakeServerAppConfig(
      ConfigIntegrationKind._Custom,
      {
        features: {
          enable_on_session: true,
          session_threshold: 60,
          web_on_focus_enabled: false,
        },
      },
    );
    const config = await getServerAppConfigSW(
      serverConfig.app_id,
      fakeDownload(serverConfig),
    );

    expect(config.enableOnSession).toBe(true);
    expect(config.sessionThreshold).toBe(60);
    expect(config.enableSessionDuration).toBe(false);
  });

  test('session fields fall back to defaults when server omits them', async () => {
    const serverConfig = TestContext.getFakeServerAppConfig(
      ConfigIntegrationKind._Custom,
    );
    delete serverConfig.features.enable_on_session;
    // @ts-expect-error -- intentionally removing to test default
    delete serverConfig.features.session_threshold;
    // @ts-expect-error -- intentionally removing to test default
    delete serverConfig.features.web_on_focus_enabled;

    const config = await getServerAppConfigSW(
      serverConfig.app_id,
      fakeDownload(serverConfig),
    );

    expect(config.enableOnSession).toBe(false);
    expect(config.sessionThreshold).toBe(30);
    expect(config.enableSessionDuration).toBe(true);
  });

  test('maps outcomes config into userConfig', async () => {
    const serverConfig = TestContext.getFakeServerAppConfig(
      ConfigIntegrationKind._Custom,
    );
    const config = await getServerAppConfigSW(
      serverConfig.app_id,
      fakeDownload(serverConfig),
    );

    const outcomes = config.userConfig.outcomes;
    expect(outcomes?.direct).toEqual(serverConfig.config.outcomes.direct);
    expect(outcomes?.indirect).toEqual({
      enabled: serverConfig.config.outcomes.indirect.enabled,
      influencedTimePeriodMin:
        serverConfig.config.outcomes.indirect.notification_attribution
          .minutes_since_displayed,
      influencedNotificationsLimit:
        serverConfig.config.outcomes.indirect.notification_attribution.limit,
    });
    expect(outcomes?.unattributed).toEqual(
      serverConfig.config.outcomes.unattributed,
    );
  });

  test('hasUnsupportedSubdomain is false for wordpress integration', async () => {
    const serverConfig = TestContext.getFakeServerAppConfig(
      ConfigIntegrationKind._WordPress,
    );
    const config = await getServerAppConfigSW(
      serverConfig.app_id,
      fakeDownload(serverConfig),
    );

    expect(config.hasUnsupportedSubdomain).toBe(false);
  });

  test('throws for typical site with proxyOriginEnabled (unsupported subdomain)', async () => {
    const serverConfig = TestContext.getFakeServerAppConfig(
      ConfigIntegrationKind._TypicalSite,
      { config: { siteInfo: { proxyOriginEnabled: true } } },
    );
    await expect(
      getServerAppConfigSW(serverConfig.app_id, fakeDownload(serverConfig)),
    ).rejects.toThrow('no longer supported');
  });

  test('hasUnsupportedSubdomain is false for typical site when proxy disabled', async () => {
    const serverConfig = TestContext.getFakeServerAppConfig(
      ConfigIntegrationKind._TypicalSite,
      { config: { siteInfo: { proxyOriginEnabled: false } } },
    );
    const config = await getServerAppConfigSW(
      serverConfig.app_id,
      fakeDownload(serverConfig),
    );

    expect(config.hasUnsupportedSubdomain).toBe(false);
  });

  test('wraps server error code 1 as InvalidAppIdError', async () => {
    const dl = () => Promise.reject({ code: 1 });
    await expect(getServerAppConfigSW(APP_ID, dl)).rejects.toBe(
      InvalidAppIdError,
    );
  });

  test('wraps server error code 2 as web push error', async () => {
    const dl = () => Promise.reject({ code: 2 });
    await expect(getServerAppConfigSW(APP_ID, dl)).rejects.toThrow(
      'App not configured for web push',
    );
  });
});
