import bowser from 'bowser';

import Environment from '../Environment';
import NotImplementedError from '../errors/NotImplementedError';
import { DeliveryPlatformKind } from './DeliveryPlatformKind';
import { DevicePlatformKind } from './DevicePlatformKind';
import { Serializable } from './Serializable';
import { SubscriptionStateKind } from './SubscriptionStateKind';
import { OneSignalUtils } from "../utils/OneSignalUtils";


/**
 * Describes the fields of a OneSignal "player" device record.
 *
 * This is used when creating or modifying push and email records.
 */
export abstract class DeviceRecord implements Serializable {
  public appId: string;
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
    this.browserName = bowser.name;
    this.browserVersion = parseInt(String(bowser.version)) !== NaN ? parseInt(String(bowser.version)) : -1;
    this.operatingSystem = this.getBrowserOperatingSystem();
    this.operatingSystemVersion = String(bowser.osversion);
    this.devicePlatform = this.getDevicePlatform();
    this.deviceModel = navigator.platform;
    this.sdkVersion = Environment.version().toString();
    this.deliveryPlatform = this.getDeliveryPlatform();
    // Unimplemented properties are appId, deliveryPlatform, subscriptionState, and subscription
  }

  getDevicePlatform(): DevicePlatformKind {
    const isMobile = bowser.mobile;
    const isTablet = bowser.tablet;

    if (isMobile) {
      return DevicePlatformKind.Mobile;
    } else if (isTablet) {
      return DevicePlatformKind.Tablet;
    } else {
      return DevicePlatformKind.Desktop;
    }
  }

  isSafari(): boolean {
    return bowser.safari && window.safari !== undefined && window.safari.pushNotification !== undefined;
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
    if (bowser.mac) {
      return "Mac OS X";
    }
    if (bowser.windows) {
      return "Microsoft Windows";
    }
    if (bowser.windowsphone) {
      return "Microsoft Windows Phone";
    }
    if (bowser.linux) {
      return "Linux";
    }
    if (bowser.chromeos) {
      return "Google Chrome OS";
    }
    if (bowser.android) {
      return "Google Android";
    }
    if (bowser.ios) {
      return "Apple iOS";
    }
    if (bowser.blackberry) {
      return "Blackberry";
    }
    if (bowser.firefoxos) {
      return "Mozilla Firefox OS";
    }
    if (bowser.webos) {
      return "WebOS";
    }
    if (bowser.tizen) {
      return "Tizen";
    }
    if (bowser.sailfish) {
      return "Sailfish OS";
    }
    return "Unknown";
  }

  getDeliveryPlatform(): DeliveryPlatformKind {
    // For testing purposes, allows changing the browser user agent
    const browser = OneSignalUtils.redetectBrowserUserAgent();

    if (this.isSafari()) {
      return DeliveryPlatformKind.Safari;
    } else if (browser.firefox) {
      return DeliveryPlatformKind.Firefox;
    } else if (browser.msedge) {
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
      serializedBundle.app_id = this.appId;
    }

    return serializedBundle;
  }

  deserialize(_: object): DeviceRecord { throw new NotImplementedError(); }
}
