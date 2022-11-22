import { ModelStoreChange } from "../core/models/ModelStoreChange";
import { ValidatorUtils } from "../page/utils/ValidatorUtils";
import { InvalidArgumentError, InvalidArgumentReason } from "../shared/errors/InvalidArgumentError";
import { InvalidStateError, InvalidStateReason } from "../shared/errors/InvalidStateError";
import EventHelper from "../shared/helpers/EventHelper";
import MainHelper from "../shared/helpers/MainHelper";
import Log from "../shared/libraries/Log";
import Database from "../shared/services/Database";
import { awaitOneSignalInitAndSupported, logMethodCall } from "../shared/utils/utils";
import OneSignal from "./OneSignal";
import { SubscriptionModel, SupportedSubscription } from "../core/models/SubscriptionModels";
import { isModelStoreHydratedObject } from "../core/utils/typePredicates";

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

    this._subscribeToPushModelChanges();
  }

  get id(): string | null | undefined {
    return this._id;
  }

  get token(): string | null | undefined {
    return this._token;
  }

  get optedIn(): boolean {
    return this._optedIn;
  }

  async optIn(): Promise<void> {
    logMethodCall('optIn');
    await awaitOneSignalInitAndSupported();
    this._optedIn = true;
    // TO DO: prompt for permission if needed
    await this._enable(true);
  }

  async optOut(): Promise<void> {
    logMethodCall('optOut');
    await awaitOneSignalInitAndSupported();
    this._optedIn = false;
    await this._enable(false);
  }

  /**
   * Resubscribes this namespace to the push model changes.
   * Should be called when the user and/or core module is reset.
   */
  async _resubscribeToPushModelChanges(): Promise<void> {
    await this._subscribeToPushModelChanges();
  }

  /* P R I V A T E */

  private async _enable(enabled: boolean): Promise<void> {
    await awaitOneSignalInitAndSupported();
    const pushModel = await OneSignal.coreDirector.getPushSubscriptionModel();
    const appConfig = await Database.getAppConfig();
    const subscription = await Database.getSubscription();

    if (!appConfig.appId) {
      throw new InvalidStateError(InvalidStateReason.MissingAppId);
    }
    if (!ValidatorUtils.isValidBoolean(enabled)) {
      throw new InvalidArgumentError('enabled', InvalidArgumentReason.Malformed);
    }

    if (pushModel) {
      const notificationTypes = MainHelper.getNotificationTypeFromOptIn(enabled);
      pushModel.set("notification_types", notificationTypes);
    }

    subscription.optedOut = !enabled;
    await Database.setSubscription(subscription);
    EventHelper.onInternalSubscriptionSet(subscription.optedOut).catch(e => {
      Log.error(e);
    });
    EventHelper.checkAndTriggerSubscriptionChanged().catch(e => {
      Log.error(e);
    });
  }

  private async _subscribeToPushModelChanges(): Promise<void> {
    const pushModel = await OneSignal.coreDirector.getPushSubscriptionModel();
    if (!pushModel) {
      return;
    }
    pushModel.subscribe((modelStoreChange: ModelStoreChange<SupportedSubscription>): void => {
      if (isModelStoreHydratedObject<SubscriptionModel>(modelStoreChange)) {
        // only update if we are hydrating entire model
        this._id = modelStoreChange.payload.data.id;
        return;
      }
    });
  }

  /*
  TO DO:
  on(event: 'subscriptionChange', listener: (isSubscribed: boolean) => void): void;
  */
}