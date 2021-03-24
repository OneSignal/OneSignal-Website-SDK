import { ExecutionContext } from "ava";
import { TestEnvironmentConfig, TestEnvironment } from "../../../support/sdk/TestEnvironment";
import { stubServiceWorkerInstallation } from "../../../support/tester/sinonSandboxUtils";
import { SlidedownPromptOptions, AppUserConfigPromptOptions, DelayedPromptType } from "../../../../src/models/Prompts";
import Slidedown from "../../../../src/slidedown/Slidedown";
import Random from "../../../support/tester/Random";

/** HELPERS */
const appId = Random.getRandomUuid();
export interface EventCounts {
    shown : number;
    closed: number;
    queued: number;
}

export async function setupWithStubs(
    sinonSandbox: sinon.SinonSandbox,
    testConfig: TestEnvironmentConfig,
    t: ExecutionContext)
    {
        await TestEnvironment.setupOneSignalPageWithStubs(sinonSandbox, testConfig, t);
        stubServiceWorkerInstallation(sinonSandbox);
}

export function getShownPromiseWithEventCounts(eventCounts: EventCounts, resolveAfter: number = 0): Promise<void> {
    return new Promise<void>(resolve => {
        OneSignal.on(Slidedown.EVENTS.SHOWN, () => {
            eventCounts.shown+=1;
            if (eventCounts.shown >= resolveAfter) { resolve(); }
        });
    });
}

export function getClosedPromiseWithEventCounts(eventCounts: EventCounts, resolveAfter: number = 0): Promise<void> {
    return new Promise<void>(resolve => {
        OneSignal.on(Slidedown.EVENTS.CLOSED, () => {
            eventCounts.closed+=1;
            if (eventCounts.closed >= resolveAfter) { resolve(); }
        });
    });
}

export function getSubscriptionPromise(): Promise<void> {
    return new Promise<void>(resolve => {
        OneSignal.on(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, () => { resolve(); });
      });
}


export async function initWithPromptOptions(prompts: SlidedownPromptOptions[]) {
    const promptOptions : AppUserConfigPromptOptions = getPromptOptions(prompts);
    return await OneSignal.init({
        appId,
        autoResubscribe: false,
        promptOptions
    });
}

export function getPromptOptions(prompts: SlidedownPromptOptions[]): AppUserConfigPromptOptions {
    return {
        slidedown: {
            prompts
        }
    };
}

export function addPromptDelays(options: SlidedownPromptOptions, pageViews: number, timeDelay: number)
    : SlidedownPromptOptions {
        options.delay = {
            timeDelay,
            pageViews
        };
        return options;
}

export const pushSlidedownOptions: SlidedownPromptOptions = {
    type: DelayedPromptType.Push,
    autoPrompt: true,
    text: {
        actionMessage: "",
        acceptButton: "",
        cancelButton: ""
    }
};

export const categorySlidedownOptions: SlidedownPromptOptions = {
    type: DelayedPromptType.Category,
    autoPrompt: true,
    text: {
        actionMessage: "",
        acceptButton: "",
        cancelButton: ""
    },
    categories: [
        {
            tag: "myTag",
            label: "myLabel"
        }
    ]
};

export const smsAndEmailOptions: SlidedownPromptOptions = {
    type: DelayedPromptType.SmsAndEmail,
    autoPrompt: true,
    text: {
        actionMessage: "",
        acceptButton: "",
        cancelButton: "",
        smsLabel: "Sms",
        emailLabel: "Email"
    }
};
