import Environment from "../../../src/Environment";
import OneSignal from "../../../src/OneSignal";
import Random from "../tester/Random";
import Database from "../../../src/services/Database";
import { NotificationPermission } from "../../../src/models/NotificationPermission";
import { Test } from "ava";
import * as jsdom from 'jsdom';
import * as DOMStorage from 'dom-storage';
import Launcher from "../../../src/bell/Launcher";


var global = new Function('return this')();

export enum HttpHttpsEnvironment {
  Http,
  Https
}

export interface TestEnvironmentConfig {
  environment?: string,
  initOptions?: any,
  httpOrHttps?: HttpHttpsEnvironment,
  permission?: NotificationPermission
}

export class TestEnvironment {

  /**
   * Intercepts requests to our virtual DOM to return fake responses.
   */
  static onVirtualDomResourceRequested(resource, callback) {
    const pathname = resource.url.pathname;
    if (pathname.startsWith('https://test.node/scripts/')) {
      if (pathname.startsWith('https://test.node/scripts/delayed')) {
        TestEnvironment.onVirtualDomDelayedResourceRequested(
          resource,
          callback.bind(null, null, `var __NODE_TEST_SCRIPT = true; var __DELAYED = true;`)
        );
      } else {
        callback(null, `var __NODE_TEST_SCRIPT = true;`);
      }
    } else if (pathname.startsWith('https://test.node/styles/')) {
      if (pathname.startsWith('https://test.node/scripts/delayed')) {
        TestEnvironment.onVirtualDomDelayedResourceRequested(
          resource,
          callback.bind(null, null, `html { margin: 0; padding: 0; font-size: 16px; }`)
        );
      } else {
        callback(null, `html { margin: 0; padding: 0; font-size: 16px; }`);
      }
    } else if (pathname.startsWith('https://test.node/codes/')) {
      if (pathname.startsWith('https://test.node/codes/500')) {
        callback(new Error("Virtual DOM error response."));
      } else {
        callback(null, `html { margin: 0; padding: 0; font-size: 16px; }`);
      }
    } else {
      return resource.defaultFetch(callback);
    }
  }

  static onVirtualDomDelayedResourceRequested(resource, callback) {
      var delay = pathname.match(/\d+/) || 1000;
      // Simulate a delayed request
      var timeout = setTimeout(function() {
        callback();
      }, delay);
      return {
        abort: function() {
          clearTimeout(timeout);
          callback(new Error("request canceled by user"));
        }
      };
  }

  static async stubDomEnvironment(config: TestEnvironmentConfig) {
    if (config && config.httpOrHttps == HttpHttpsEnvironment.Http) {
      var url = 'http://localhost:3000/webpush/sandbox?http=1';
    } else {
      var url = 'https://localhost:3001/webpush/sandbox?https=1';
    }
    global.window = await new Promise((resolve, reject) => {
      jsdom.env({
        html: '<!doctype html><html><head></head><body></body></html>',
        url: url,
        features: {
          FetchExternalResources : ["script", "frame", "iframe", "link", "img"],
          ProcessExternalResources: ['script']
        },
        resourceLoader: TestEnvironment.onVirtualDomResourceRequested,
        done: (err, window) => {
          if (err) {
            console.log(err);
            reject('Failed to create a JsDom mock browser environment:' + err);
          } else {
            resolve(window);
          }
        }
      });
    });
    jsdom.reconfigureWindow(global.window, { top: global.window });
    global.document = global.window.document;
    global.navigator = global.window.navigator;
    global.location = global.window.location;
    global.localStorage = global.window.localStorage = new DOMStorage(null);
    global.sessionStorage = global.window.sessionStorage = new DOMStorage(null);
  }

  static stubNotification(config: TestEnvironmentConfig) {
    global.window.Notification = global.Notification = {
      permission: config.permission ? config.permission: NotificationPermission.Default,
      maxActions: 2,
      requestPermission: function() { }
    };
  }

  static stubNotifyButtonTransitionEvents() {
    //Launcher.prototype.resize = async function(...args: any[]) { return undefined; }
    //Launcher.prototype.resize = async function(...args: any[]) { return undefined; }
    //Launcher.prototype.resize = async function(...args: any[]) { return undefined; }
  }

  static async initialize(config: TestEnvironmentConfig = {}) {
    Database.databaseInstanceName = Random.getRandomString(10);
    global.OneSignal = OneSignal;
    global.OneSignal.config = config.initOptions ? config.initOptions : {};
    global.OneSignal.initialized = true;
    await TestEnvironment.stubDomEnvironment(config);
    TestEnvironment.stubNotifyButtonTransitionEvents();
    TestEnvironment.stubNotification(config);
    if (config.environment) {
      Environment.getEnv = () => config.environment;
    }
    return global.OneSignal;
  }
}