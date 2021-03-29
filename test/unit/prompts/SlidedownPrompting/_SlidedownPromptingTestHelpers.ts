import { ExecutionContext } from "ava";
import { TestEnvironmentConfig, TestEnvironment } from "../../../support/sdk/TestEnvironment";
import { stubServiceWorkerInstallation } from "../../../support/tester/sinonSandboxUtils";
import { SlidedownPromptOptions, DelayedPromptType } from "../../../../src/models/Prompts";
import Random from "../../../support/tester/Random";
import { SinonSandbox } from "sinon";
import { EventCounts } from "../../../support/tester/EventsTestHelper";
import { CHANNEL_CAPTURE_CONTAINER_CSS_IDS } from "../../../../src/slidedown/constants";

/** HELPERS */
const appId = Random.getRandomUuid();

const minimalText = {
    actionMessage: "",
    acceptButton: "",
    cancelButton: ""
};

export class SlidedownPromptingTestHelper {
    private sinonSandbox;
    constructor(sinonSandbox: SinonSandbox) {
        this.sinonSandbox = sinonSandbox;
    }

    public async setupWithStubs(
        testConfig: TestEnvironmentConfig,
        t: ExecutionContext) {
            await TestEnvironment.setupOneSignalPageWithStubs(this.sinonSandbox, testConfig, t);
            stubServiceWorkerInstallation(this.sinonSandbox);
    }

    public async initWithPromptOptions(prompts: SlidedownPromptOptions[]) {
        return await OneSignal.init({
            appId,
            autoResubscribe: false,
            promptOptions:{
                slidedown: {
                    prompts
                }
            }
        });
    }

    public addPromptDelays(options: SlidedownPromptOptions, pageViews: number, timeDelay: number)
        : SlidedownPromptOptions {
            options.delay = {
                timeDelay,
                pageViews
            };
            return options;
    }

    public getMinimalPushSlidedownOptions(): SlidedownPromptOptions {
        return {
            type: DelayedPromptType.Push,
            autoPrompt: true,
            text: minimalText
        };
    }

    public getMinimalCategorySlidedownOptions(): SlidedownPromptOptions {
        return {
            type: DelayedPromptType.Category,
            autoPrompt: true,
            text: minimalText,
            categories: [
                {
                    tag: "myTag",
                    label: "myLabel"
                }
            ]
        };
    }

    public getMinimalSmsAndEmailOptions(): SlidedownPromptOptions {
        return {
            type: DelayedPromptType.SmsAndEmail,
            autoPrompt: true,
            text: {
                actionMessage: "",
                acceptButton: "",
                cancelButton: ""
            }
        };
    }

    public getMinimalSmsOptions(): SlidedownPromptOptions {
        return {
            type: DelayedPromptType.Sms,
            autoPrompt: true,
            text: minimalText
        };
    }

    public getMinimalEmailOptions(): SlidedownPromptOptions {
        return {
            type: DelayedPromptType.Email,
            autoPrompt: true,
            text: minimalText
        };
    }

    public inputEmail(email: string) {
        const onesignalEmailInput = document.querySelector(`#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalEmailInput}`);
        (<HTMLInputElement>onesignalEmailInput).value = email;
    }

    static resetEventCounts(counts: EventCounts): void {
        counts.shown  = 0;
        counts.closed = 0;
        counts.queued = 0;
    }
}
