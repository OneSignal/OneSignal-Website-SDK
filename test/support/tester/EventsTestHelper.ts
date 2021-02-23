import Slidedown from "../../../src/slidedown/Slidedown";
import { SubscriptionManager } from '../../../src/managers/SubscriptionManager';
import OneSignalEvent from "../../../src/Event";
import { SinonSandbox } from 'sinon';
import { stubServiceWorkerInstallation } from "../../support/tester/sinonSandboxUtils";

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
            OneSignalEvent.trigger(Slidedown.EVENTS.CANCEL_CLICK);
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
}
