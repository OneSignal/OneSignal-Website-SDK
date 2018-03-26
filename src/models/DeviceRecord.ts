import * as Browser from 'bowser';

import Environment from '../Environment';
import NotImplementedError from '../errors/NotImplementedError';
import { DeliveryPlatformKind } from './DeliveryPlatformKind';
import { DevicePlatformKind } from './DevicePlatformKind';
import { RawPushSubscription } from './RawPushSubscription';
import { Serializable } from './Serializable';
import { SubscriptionStateKind } from './SubscriptionStateKind';
import { Uuid } from './Uuid';
import { redetectBrowserUserAgent } from "../utils";


/**
 * Describes the fields of a OneSignal "player" device record.
 *
 * This is used when creating or modifying push and email records.
 */
export abstract class DeviceRecord implements Serializable {
  public appId: Uuid;
  public deliveryPlatform: DeliveryPlatformKind;
  public language: string;
  public timezone: number;
  public browserName: string;
  public browserVersion: number;
  public operatingSystem: string;
  public operatingSystemVersion: string;
  public devicePlatform: DevicePlatformKind;
  public deviceModel: string;
  public sdkVersion: string;
  public subscriptionState: SubscriptionStateKind;

  constructor() {
    this.language = Environment.getLanguage();
    this.timezone = new Date().getTimezoneOffset() * -60;
    this.browserName = Browser.name;
    this.browserVersion = parseInt(String(Browser.version)) !== NaN ? parseInt(String(Browser.version)) : -1;
    this.operatingSystem = this.getBrowserOperatingSystem();
    this.operatingSystemVersion = String(Browser.osversion);
    this.devicePlatform = this.getDevicePlatform();
    this.deviceModel = navigator.platform;
    this.sdkVersion = Environment.version().toString();
    this.deliveryPlatform = this.getDeliveryPlatform();
    // Unimplemented properties are appId, deliveryPlatform, subscriptionState, and subscription
  }

  getDevicePlatform(): DevicePlatformKind {
    const isMobile = Browser.mobile;
    const isTablet = Browser.tablet;

    if (isMobile) {
      return DevicePlatformKind.Mobile;
    } else if (isTablet) {
      return DevicePlatformKind.Tablet;
    } else {
      return DevicePlatformKind.Desktop;
    }
  }

  isSafari(): boolean {
    return Browser.safari && window.safari !== undefined && window.safari.pushNotification !== undefined;
  }

  getBrowserOperatingSystem(): string {
    /*
      mac
      windows - other than Windows Phone
      windowsphone
      linux - other than android, chromeos, webos, tizen, and sailfish
      chromeos
      android
      ios - also sets one of iphone/ipad/ipod
      blackberry
      firefoxos
      webos - may also set touchpad
      bada
      tizen
      sailfish
    */
    if (Browser.mac) {
      return "Mac OS X";
    }
    if (Browser.windows) {
      return "Microsoft Windows";
    }
    if (Browser.windowsphone) {
      return "Microsoft Windows Phone";
    }
    if (Browser.linux) {
      return "Linux";
    }
    if (Browser.chromeos) {
      return "Google Chrome OS";
    }
    if (Browser.android) {
      return "Google Android";
    }
    if (Browser.ios) {
      return "Apple iOS";
    }
    if (Browser.blackberry) {
      return "Blackberry";
    }
    if (Browser.firefoxos) {
      return "Mozilla Firefox OS";
    }
    if (Browser.webos) {
      return "WebOS";
    }
    if (Browser.tizen) {
      return "Tizen";
    }
    if (Browser.sailfish) {
      return "Sailfish OS";
    }
    return "Unknown";
  }

  getDeliveryPlatform(): DeliveryPlatformKind {
    // For testing purposes, allows changing the browser user agent
    const browser = redetectBrowserUserAgent();

    if (this.isSafari()) {
      return DeliveryPlatformKind.Safari;
    } else if (Browser.firefox) {
      return DeliveryPlatformKind.Firefox;
    } else if (Browser.msedge) {
      return DeliveryPlatformKind.Edge;
    } else {
      return DeliveryPlatformKind.ChromeLike;
    }
  }

  serialize() {
    const serializedBundle: any = {
      /* Old Parameters */
      device_type: this.deliveryPlatform,
      language: this.language,
      timezone: this.timezone,
      device_os: this.browserVersion,
      sdk: this.sdkVersion,
      notification_types: this.subscriptionState,
      /* New Parameters */
      delivery_platform: this.deliveryPlatform,
      browser_name: this.browserName,
      browser_version: this.browserVersion,
      operating_system: this.operatingSystem,
      operating_system_version: this.operatingSystemVersion,
      device_platform: this.devicePlatform,
      device_model: this.deviceModel,
    };

    if (this.appId) {
      serializedBundle.app_id = this.appId.value;
    }

    return serializedBundle;
  }

  deserialize(_: object): DeviceRecord { throw new NotImplementedError(); }
}
