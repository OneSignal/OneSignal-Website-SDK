import { ExecutionContext } from "ava";
import { TestEnvironmentConfig, TestEnvironment } from "../../../support/sdk/TestEnvironment";
import { stubServiceWorkerInstallation } from "../../../support/tester/sinonSandboxUtils";
import { SlidedownPromptOptions, AppUserConfigPromptOptions, DelayedPromptType } from "../../../../src/models/Prompts";
import Random from "../../../support/tester/Random";
import { SinonSandbox } from "sinon";

/** HELPERS */
const appId = Random.getRandomUuid();

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
            text: {
                actionMessage: "",
                acceptButton: "",
                cancelButton: ""
            }
        };
    }

    public getMinimalCategorySlidedownOptions(): SlidedownPromptOptions {
        return {
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
    }
}


/* UNUSED CURRENTLY

 const minimalSmsAndEmailOptions: SlidedownPromptOptions = {
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
*/
