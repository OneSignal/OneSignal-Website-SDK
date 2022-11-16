import { ValidatorUtils } from "../page/utils/ValidatorUtils";
import OneSignalApi from "../shared/api/OneSignalApi";
import { InvalidArgumentError, InvalidArgumentReason } from "../shared/errors/InvalidArgumentError";
import { InvalidStateError, InvalidStateReason } from "../shared/errors/InvalidStateError";
import { NotSubscribedError, NotSubscribedReason } from "../shared/errors/NotSubscribedError";
import EventHelper from "../shared/helpers/EventHelper";
import MainHelper from "../shared/helpers/MainHelper";
import Log from "../shared/libraries/Log";
import { UpdatePlayerOptions } from "../shared/models/UpdatePlayerOptions";
import Database from "../shared/services/Database";
import { awaitOneSignalInitAndSupported, logMethodCall } from "../shared/utils/utils";

export default class PushSubscriptionNamespace {
  private _id?: string | null;
  private _token?: string | null;
  private _optedIn: boolean = false;

  constructor() {
    Database.getSubscription().then(subscription => {
      this._optedIn = !subscription.optedOut;
      this._token = subscription.subscriptionToken;
    }).catch(e => {
      Log.error(e);
    });
  }

  async disabled(disabled: boolean): Promise<void> {
    await awaitOneSignalInitAndSupported();
    logMethodCall('disable', disabled);
    const appConfig = await Database.getAppConfig();
    const { appId } = appConfig;
    const subscription = await Database.getSubscription();
    const { deviceId } = subscription;
    if (!appConfig.appId)
      throw new InvalidStateError(InvalidStateReason.MissingAppId);
    if (!ValidatorUtils.isValidBoolean(disabled))
      throw new InvalidArgumentError('disabled', InvalidArgumentReason.Malformed);
    if (!deviceId) {
      // TODO: Throw an error here in future v2; for now it may break existing client implementations.
      Log.info(new NotSubscribedError(NotSubscribedReason.NoDeviceId));
      return;
    }
    const options : UpdatePlayerOptions = {
      notification_types: MainHelper.getNotificationTypeFromOptIn(!disabled)
    };

    const authHash = await Database.getExternalUserIdAuthHash();
    if (!!authHash) {
      options.external_user_id_auth_hash = authHash;
    }

    subscription.optedOut = disabled;
    await OneSignalApi.updatePlayer(appId, deviceId, options);
    await Database.setSubscription(subscription);
    EventHelper.onInternalSubscriptionSet(subscription.optedOut).catch(e => {
      Log.error(e);
    });
    EventHelper.checkAndTriggerSubscriptionChanged().catch(e => {
      Log.error(e);
    });
  }

  /*
  TO DO:
  on(event: 'subscriptionChange', listener: (isSubscribed: boolean) => void): void;
  */
}