import { ModelStoreChange } from "../core/models/ModelStoreChange";
import { ValidatorUtils } from "../page/utils/ValidatorUtils";
import { InvalidArgumentError, InvalidArgumentReason } from "../shared/errors/InvalidArgumentError";
import { InvalidStateError, InvalidStateReason } from "../shared/errors/InvalidStateError";
import EventHelper from "../shared/helpers/EventHelper";
import MainHelper from "../shared/helpers/MainHelper";
import Log from "../shared/libraries/Log";
import Database from "../shared/services/Database";
import { awaitOneSignalInitAndSupported, logMethodCall } from "../shared/utils/utils";
import { SubscriptionModel, SupportedSubscription } from "../core/models/SubscriptionModels";
import { isCompleteSubscriptionObject, isModelStoreHydratedObject } from "../core/utils/typePredicates";
import { EventListenerBase } from "../page/userModel/EventListenerBase";
import SubscriptionChangeEvent from "../page/models/SubscriptionChangeEvent";
import { OSModel } from "../core/modelRepo/OSModel";
import { Subscription } from "../shared/models/Subscription";

export default class PushSubscriptionNamespace extends EventListenerBase {
  private _id?: string | null;
  private _token?: string | null;
  private _optedIn?: boolean;
  private _permission?: NotificationPermission;

  constructor(initialize: boolean, subscription?: Subscription, permission?: NotificationPermission) {
    super();
    if (!initialize || !subscription) {
      Log.warn(`PushSubscriptionNamespace: skipping initialization. One or more required params are falsy: initialize: ${initialize}, subscription: ${subscription}`);
      return;
    }

    this._optedIn = !subscription.optedOut;
    this._permission = permission;
    this._token = subscription.subscriptionToken;

    OneSignal.coreDirector.getCurrentPushSubscriptionModel()
      .then((pushModel: OSModel<SupportedSubscription> | undefined) => {
        if (pushModel && isCompleteSubscriptionObject(pushModel.data)) {
          this._id = pushModel.data.id;
        }
      }).catch(e => {
        Log.error(e);
      });

    this._subscribeToPushModelChanges().catch(e => {
      Log.error(e);
    });

    OneSignal.emitter.on(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, async () => {
      this._token = await MainHelper.getCurrentPushToken();
    });

    OneSignal.emitter.on(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, async (permission: NotificationPermission) => {
      this._permission = permission;
    });
  }

  get id(): string | null | undefined {
    return this._id;
  }

  get token(): string | null | undefined {
    return this._token;
  }

  get optedIn(): boolean {
    return !!this._optedIn && this._permission === 'granted';
  }

  async optIn(): Promise<void> {
    logMethodCall('optIn');
    await awaitOneSignalInitAndSupported();
    this._optedIn = true;

    const permissionStatus = await OneSignal.Notifications.getPermissionStatus();

    if (permissionStatus !== 'granted') {
      // TO DO: use user-config options prompting method
      await OneSignal.Notifications.requestPermission();
      return;
    }

    await this._enable(true);
  }

  async optOut(): Promise<void> {
    logMethodCall('optOut');
    await awaitOneSignalInitAndSupported();
    this._optedIn = false;
    await this._enable(false);
  }

  addEventListener(event: "subscriptionChange", listener: (change: SubscriptionChangeEvent) => void): void {
    OneSignal.emitter.on(event, listener);
  }

  removeEventListener(event: "subscriptionChange", listener: (change: SubscriptionChangeEvent) => void): void {
    OneSignal.emitter.off(event, listener);
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
    const appConfig = await Database.getAppConfig();
    const subscriptionFromDb = await Database.getSubscription();

    if (!appConfig.appId) {
      throw new InvalidStateError(InvalidStateReason.MissingAppId);
    }
    if (!ValidatorUtils.isValidBoolean(enabled)) {
      throw new InvalidArgumentError('enabled', InvalidArgumentReason.Malformed);
    }

    subscriptionFromDb.optedOut = !enabled;
    await Database.setSubscription(subscriptionFromDb);
    EventHelper.onInternalSubscriptionSet(subscriptionFromDb.optedOut).catch(e => {
      Log.error(e);
    });
    EventHelper.checkAndTriggerSubscriptionChanged().catch(e => {
      Log.error(e);
    });
  }

  private async _subscribeToPushModelChanges(): Promise<void> {
    const pushModel = await OneSignal.coreDirector.getCurrentPushSubscriptionModel();
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
}
