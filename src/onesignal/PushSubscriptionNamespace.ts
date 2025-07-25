import { isCompleteSubscriptionObject } from '../core/utils/typePredicates';
import type SubscriptionChangeEvent from '../page/models/SubscriptionChangeEvent';
import { EventListenerBase } from '../page/userModel/EventListenerBase';
import { ValidatorUtils } from '../page/utils/ValidatorUtils';
import {
  InvalidArgumentError,
  InvalidArgumentReason,
} from '../shared/errors/InvalidArgumentError';
import {
  InvalidStateError,
  InvalidStateReason,
} from '../shared/errors/InvalidStateError';
import EventHelper from '../shared/helpers/EventHelper';
import Log from '../shared/libraries/Log';
import { Subscription } from '../shared/models/Subscription';
import Database from '../shared/services/Database';
import {
  awaitOneSignalInitAndSupported,
  logMethodCall,
} from '../shared/utils/utils';

export default class PushSubscriptionNamespace extends EventListenerBase {
  private _id?: string | null;
  private _token?: string | null;
  private _optedIn?: boolean;
  private _permission?: NotificationPermission;

  constructor(
    initialize: boolean,
    subscription?: Subscription,
    permission?: NotificationPermission,
  ) {
    super();
    if (!initialize || !subscription) {
      Log.warn(
        `PushSubscriptionNamespace: skipping initialization. One or more required params are falsy: initialize: ${initialize}, subscription: ${subscription}`,
      );
      return;
    }

    this._optedIn = !subscription.optedOut;
    this._permission = permission;
    this._token = subscription.subscriptionToken;

    OneSignal.coreDirector
      .getPushSubscriptionModel()
      .then((pushModel) => {
        if (isCompleteSubscriptionObject(pushModel)) {
          pushModel;
          this._id = pushModel.id;
        }
      })
      .catch((e) => {
        Log.error(e);
      });

    OneSignal.emitter.on(
      OneSignal.EVENTS.SUBSCRIPTION_CHANGED,
      async (change: SubscriptionChangeEvent | undefined) => {
        this._id = change?.current.id;
        this._token = change?.current.token;
      },
    );

    OneSignal.emitter.on(
      OneSignal.EVENTS.NOTIFICATION_PERMISSION_CHANGED_AS_STRING,
      async (permission: NotificationPermission) => {
        this._permission = permission;
      },
    );
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

    const permissionStatus =
      await OneSignal.context.permissionManager.getPermissionStatus();

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

  addEventListener(
    event: 'change',
    listener: (change: SubscriptionChangeEvent) => void,
  ): void {
    OneSignal.emitter.on(event, listener);
  }

  removeEventListener(
    event: 'change',
    listener: (change: SubscriptionChangeEvent) => void,
  ): void {
    OneSignal.emitter.off(event, listener);
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
      throw new InvalidArgumentError(
        'enabled',
        InvalidArgumentReason.Malformed,
      );
    }

    subscriptionFromDb.optedOut = !enabled;
    await Database.setSubscription(subscriptionFromDb);
    EventHelper.onInternalSubscriptionSet(subscriptionFromDb.optedOut).catch(
      (e) => {
        Log.error(e);
      },
    );
    EventHelper.checkAndTriggerSubscriptionChanged().catch((e) => {
      Log.error(e);
    });
  }
}
