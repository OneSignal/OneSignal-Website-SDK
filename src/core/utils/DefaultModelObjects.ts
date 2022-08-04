import { SubscriptionsCollection } from "../../onesignal/subscriptions/SubscriptionsCollection";
import { AppConfig } from "../../shared/models/AppConfig";
import { IdentityModel, UserProperties } from "../types";

/**
 * Purpose here is to provide dummy objects for use in the absence of a model
 * in the cache. ObservableSlim has an ES5 limitation that object properties
 * must be known at creation time.
 */

// TO DO: fill out with dummy data

const identity: IdentityModel = {
  onesignal_id: "",
  external_id: undefined,
};

const properties: UserProperties = {};

const subscriptions: SubscriptionsCollection = {};

const config: AppConfig = {
  appId: "",
  origin: "",
  siteName: "",
  userConfig: {},
  metrics: {
    enable: false,
    mixpanelReportingToken: "",
  },
  subdomain: undefined,
  httpUseOneSignalCom: undefined,
  restrictedOriginEnabled: undefined,
  enableOnSession: undefined,
  enableSessionDuration: undefined,
  safariWebId: undefined,
  vapidPublicKey: undefined,
  onesignalVapidPublicKey: undefined,
  pageUrl: undefined,
  sessionThreshold: undefined,
};

const DEFAULT_MODELS = {
  identity,
  properties,
  subscriptions,
  config
};

export default DEFAULT_MODELS;