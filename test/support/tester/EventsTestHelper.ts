import Slidedown from "../../../src/slidedown/Slidedown";
import { SubscriptionManager } from '../../../src/managers/SubscriptionManager';
import OneSignalEvent from "../../../src/Event";
import { SinonSandbox } from 'sinon';
import { stubServiceWorkerInstallation } from "../../support/tester/sinonSandboxUtils";
import ConfirmationToast from "../../../src/slidedown/ConfirmationToast";

/**
 * I M P O R T A N T
 * To correctly test the EventCount values, remember to call the
 * corresponding `get*PromiseWithEventCounts` EventsTestHelper function in the test
 */
export interface EventCounts {
    shown : number;
    closed: number;
    queued: number;
}

export default class EventsTestHelper {
  private readonly sinonSandbox: SinonSandbox;
  public eventCounts: EventCounts;

  constructor(sinonSandbox: SinonSandbox) {
      this.sinonSandbox = sinonSandbox;
      this.eventCounts = {
        shown: 0,
        closed: 0,
        queued: 0
      };
  }

  public getShownPromiseWithEventCounts(resolveAfter: number = 0): Promise<void> {
    return new Promise<void>(resolve => {
        OneSignal.on(Slidedown.EVENTS.SHOWN, () => {
            this.eventCounts.shown += 1;
            if (this.eventCounts.shown >= resolveAfter) { resolve(); }
        });
    });
  }

  public getClosedPromiseWithEventCounts(resolveAfter: number = 0): Promise<void> {
      return new Promise<void>(resolve => {
          OneSignal.on(Slidedown.EVENTS.CLOSED, () => {
              this.eventCounts.closed += 1;
              if (this.eventCounts.closed >= resolveAfter) { resolve(); }
          });
      });
  }

  public getAllowClickHandlingPromise(): Promise<void> {
    return new Promise<void>(resolve => {
      OneSignal.on(OneSignal.EVENTS.TEST_FINISHED_ALLOW_CLICK_HANDLING, () => {
        resolve();
      });
    });
  }

  public simulateSubscribingAfterNativeAllow() {
    OneSignal.emitter.on(OneSignal.EVENTS.PERMISSION_PROMPT_DISPLAYED, () => {
        this.sinonSandbox.stub(OneSignal, "privateGetSubscription").resolves(true);
        this.sinonSandbox.stub(SubscriptionManager.prototype, "getSubscriptionState")
            .resolves({ subscribed: true, isOptedOut: false });
        stubServiceWorkerInstallation(this.sinonSandbox);
    });
  }

  /* S T A T I C */

  static simulateSlidedownAllow() {
      OneSignalEvent.trigger(Slidedown.EVENTS.ALLOW_CLICK);
  }

  static simulateSlidedownAllowAfterShown() {
      OneSignal.on(Slidedown.EVENTS.SHOWN, () => {
          OneSignalEvent.trigger(Slidedown.EVENTS.ALLOW_CLICK);
      });
  }

  static simulateSlidedownDismissAfterShown() {
      OneSignal.on(Slidedown.EVENTS.SHOWN, () => {
          // must emit both events to mimick behavior in `Slidedown.onSlidedownCanceled`
          OneSignalEvent.trigger(Slidedown.EVENTS.CANCEL_CLICK);
          Slidedown.triggerSlidedownEvent(Slidedown.EVENTS.CLOSED);
      });
  }

  static simulateSlidedownCloseAfterAllow() {
      OneSignal.on(Slidedown.EVENTS.ALLOW_CLICK, () => {
          OneSignalEvent.trigger(Slidedown.EVENTS.CLOSED);
      });
  }

  static async simulateSubscriptionChanged(to: boolean) {
    await OneSignalEvent.trigger(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, to);
  }

  static getToastShownPromise(): Promise<void> {
      return new Promise<void>(resolve => {
          OneSignal.on(ConfirmationToast.EVENTS.SHOWN, () => {
              resolve();
          });
      });
  }

  static getToastClosedPromise(): Promise<void> {
      return new Promise<void>(resolve => {
          OneSignal.on(ConfirmationToast.EVENTS.CLOSED, () => {
              resolve();
          });
      });
  }

  static getSubscriptionPromise(): Promise<void> {
      return new Promise<void>(resolve => {
          OneSignal.on(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, () => { resolve(); });
      });
  }
}
