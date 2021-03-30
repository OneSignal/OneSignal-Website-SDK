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

    constructor(sinonSandbox: SinonSandbox) {
        this.sinonSandbox = sinonSandbox;
    }

    public simulateSlidedownAllow() {
        OneSignalEvent.trigger(Slidedown.EVENTS.ALLOW_CLICK);
    }

    public simulateSlidedownAllowAfterShown() {
        OneSignal.on(Slidedown.EVENTS.SHOWN, () => {
            OneSignalEvent.trigger(Slidedown.EVENTS.ALLOW_CLICK);
        });
    }

    public simulateSlidedownDismissAfterShown() {
        OneSignal.on(Slidedown.EVENTS.SHOWN, () => {
            // must emit both events to mimick behavior in `Slidedown.onSlidedownCanceled`
            OneSignalEvent.trigger(Slidedown.EVENTS.CANCEL_CLICK);
            Slidedown.triggerSlidedownEvent(Slidedown.EVENTS.CLOSED);
        });
    }

    public simulateSlidedownCloseAfterAllow() {
        OneSignal.on(Slidedown.EVENTS.ALLOW_CLICK, () => {
            OneSignalEvent.trigger(Slidedown.EVENTS.CLOSED);
        });
    }

    public simulateNativeAllowAfterShown() {
        OneSignal.emitter.on(OneSignal.EVENTS.PERMISSION_PROMPT_DISPLAYED, () => {
            this.sinonSandbox.stub(SubscriptionManager.prototype, "getSubscriptionState")
                .resolves({ subscribed: true, isOptedOut: false });
            stubServiceWorkerInstallation(this.sinonSandbox);
        });
    }

    // static

    static getShownPromiseWithEventCounts(eventCounts: EventCounts, resolveAfter: number = 0): Promise<void> {
        return new Promise<void>(resolve => {
            OneSignal.on(Slidedown.EVENTS.SHOWN, () => {
                eventCounts.shown += 1;
                if (eventCounts.shown >= resolveAfter) { resolve(); }
            });
        });
    }

    static getClosedPromiseWithEventCounts(eventCounts: EventCounts, resolveAfter: number = 0): Promise<void> {
        return new Promise<void>(resolve => {
            OneSignal.on(Slidedown.EVENTS.CLOSED, () => {
                eventCounts.closed += 1;
                if (eventCounts.closed >= resolveAfter) { resolve(); }
            });
        });
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
