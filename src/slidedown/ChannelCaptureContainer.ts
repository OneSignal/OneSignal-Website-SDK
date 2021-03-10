import Log from "../libraries/Log";
import { addCssClass, getDomElementOrStub } from "../utils";
import { DelayedPromptType, SlidedownPromptOptions } from "../models/Prompts";
import {
    CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES,
    CHANNEL_CAPTURE_CONTAINER_CSS_IDS,
    DANGER_ICON,
    SLIDEDOWN_CSS_IDS
} from "./constants";

export default class ChannelCaptureContainer {
    private promptOptions: SlidedownPromptOptions;
    private smsInputFieldIsValid: boolean = true;
    private itiOneSignal: any; // iti library initialization return obj

    constructor(promptOptions: SlidedownPromptOptions) {
        this.promptOptions = promptOptions;
    }

    public mount(): void {
        const captureContainer = this.generateHtml();
        const body = getDomElementOrStub(`#${SLIDEDOWN_CSS_IDS.body}`);
        body.append(captureContainer);
        this.initializePhoneInputLibrary();
    }

    private generateHtml(): Element {
        const captureContainer      = document.createElement("div");
        addCssClass(captureContainer, CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.channelCaptureContainer);
        let label, smsInputElement, emailInputElement;

        switch (this.promptOptions.type) {
            case DelayedPromptType.Sms:
                label = this.promptOptions.text.smsLabel || "Phone Number";
                smsInputElement = this.getSmsInputWithValidationElement(label);
                captureContainer.appendChild(smsInputElement);
                break;
            case DelayedPromptType.Email:
                label = this.promptOptions.text.smsLabel || "Email";
                emailInputElement = this.getEmailInputWithValidationElement(label);
                captureContainer.appendChild(emailInputElement);
                break;
            case DelayedPromptType.SmsAndEmail:
                label = this.promptOptions.text.smsLabel || "Email";
                emailInputElement = this.getEmailInputWithValidationElement(label);
                captureContainer.appendChild(emailInputElement);
                label = this.promptOptions.text.smsLabel || "Phone Number";
                smsInputElement = this.getSmsInputWithValidationElement(label);
                captureContainer.appendChild(smsInputElement);
                break;
            default:
                break;
        }

        return captureContainer;
    }

    private getValidationElementWithMessage(message: string): Element {
        const wrapperDiv   = document.createElement("div");
        const iconElement  = document.createElement("img");
        const errorMessage = document.createElement("p");
        errorMessage.innerText = message;

        iconElement.setAttribute("src", DANGER_ICON);
        wrapperDiv.appendChild(iconElement);
        wrapperDiv.appendChild(errorMessage);
        return wrapperDiv;
    }

    private getSmsInputWithValidationElement(label: string): Element {
        const labelElement = document.createElement("label");
        const inputElement = document.createElement("input");
        const clear         = document.createElement("div");
        const clear2         = document.createElement("div");
        const validationElement = this.getValidationElementWithMessage("Please enter a valid phone number");
        const wrappingDiv  = document.createElement("div");

        clear.setAttribute("style", "clear:both");
        clear2.setAttribute("style", "clear:both");

        addCssClass(validationElement, CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalValidationElementHidden);
        addCssClass(validationElement, CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalValidationElement);
        validationElement.id = CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalSmsValidationElement;

        labelElement.title      = label;
        labelElement.innerText  = label;

        inputElement.type  = "tel";
        inputElement.id    = CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalSmsInput;

        addCssClass(inputElement, CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalSmsInput);
        addCssClass(wrappingDiv, CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.inputWithValidationElement);
        wrappingDiv.id = CHANNEL_CAPTURE_CONTAINER_CSS_IDS.smsInputWithValidationElement;

        wrappingDiv.appendChild(labelElement);
        wrappingDiv.appendChild(clear);
        wrappingDiv.appendChild(inputElement);
        wrappingDiv.appendChild(clear2);
        wrappingDiv.appendChild(validationElement);

        return wrappingDiv;
    }

    private getEmailInputWithValidationElement(label: string): Element {
        const labelElement = document.createElement("label");
        const inputElement = document.createElement("input");
        const clear         = document.createElement("div");
        const clear2         = document.createElement("div");
        const validationElement = this.getValidationElementWithMessage("Please enter a valid email");
        const wrappingDiv  = document.createElement("div");

        clear.setAttribute("style", "clear:both");
        clear2.setAttribute("style", "clear:both");

        addCssClass(validationElement, CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalValidationElementHidden);
        addCssClass(validationElement, CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalValidationElement);
        validationElement.id = CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalEmailValidationElement;

        labelElement.title      = label;
        labelElement.innerText  = label;

        inputElement.type  = "email";
        inputElement.id    = CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalEmailInput;

        addCssClass(inputElement, CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalEmailInput);
        addCssClass(wrappingDiv, CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.inputWithValidationElement);
        wrappingDiv.id = CHANNEL_CAPTURE_CONTAINER_CSS_IDS.emailInputWithValidationElement;

        wrappingDiv.appendChild(labelElement);
        wrappingDiv.appendChild(clear);
        wrappingDiv.appendChild(inputElement);
        wrappingDiv.appendChild(clear2);
        wrappingDiv.appendChild(validationElement);

        return wrappingDiv;

    }

    private initializePhoneInputLibrary(): void {
        const onesignalSmsInput = document.querySelector("#iti-onesignal-sms-input");
        if (onesignalSmsInput && !!window.intlTelInput) {
            this.itiOneSignal = window.intlTelInput(onesignalSmsInput, {
                autoPlaceholder: "off",
                separateDialCode: true
            });
            onesignalSmsInput.addEventListener('keyup', () => {
                this.smsInputFieldIsValid = this.itiOneSignal.isValidNumber() ||
                    (<HTMLInputElement>onesignalSmsInput).value === "";
            });
            // covers case where number is typed, then country is changed
            onesignalSmsInput.addEventListener('blur', () => {
                this.smsInputFieldIsValid = this.itiOneSignal.isValidNumber() ||
                    (<HTMLInputElement>onesignalSmsInput).value === "";
            });
        } else {
            Log.error("OneSignal: there was a problem initializing International Telephone Input");
        }
    }

    // static functions

    static areBothInputFieldsEmpty(): boolean {
        const onesignalSmsInput = document.querySelector("#iti-onesignal-sms-input");
        const smsFieldEmpty = (<HTMLInputElement>onesignalSmsInput).value === "";
        const emailFieldEmpty = ChannelCaptureContainer.getValueFromEmailInput() === "";
        return smsFieldEmpty && emailFieldEmpty;
    }

    static showSmsInputError(state: boolean): void {
        const validationElement = document.querySelector(
            `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalSmsValidationElement}`
        );
        const inputElement = document.querySelector(
            `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.smsInputWithValidationElement}`
        );

        if (!validationElement || !inputElement) {
            Log.error("OneSignal: couldn't find slidedown validation element");
            return;
        }

        if (state) {
            validationElement.classList.remove(CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalValidationElementHidden);
            inputElement.classList.add(CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalErrorInput);
        } else {
            validationElement.classList.add(CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalValidationElementHidden);
            inputElement.classList.remove(CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalErrorInput);
        }
    }

    static showEmailInputError(state: boolean): void {
        const validationElement = document.querySelector(
            `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalEmailValidationElement}`
        );
        const inputElement = document.querySelector(
            `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.emailInputWithValidationElement}`
        );

        if (!validationElement || !inputElement) {
            Log.error("OneSignal: couldn't find slidedown validation element");
            return;
        }

        if (state) {
            // show error
            validationElement.classList.remove(CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalValidationElementHidden);
            inputElement.classList.add(CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalErrorInput);
        } else {
            validationElement.classList.add(CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalErrorInput);
            inputElement.classList.remove(CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalValidationElementHidden);
        }
    }

    static resetInputErrorStates() {
        ChannelCaptureContainer.showEmailInputError(false);
        ChannelCaptureContainer.showSmsInputError(false);
    }

    static getValueFromEmailInput(): string | undefined {
        const selector = `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalEmailInput}`;
        const inputNode: HTMLInputElement | null = document.querySelector(selector);
        return inputNode?.value;
    }

    static validateEmailInputWithReturnVal(emailString?: string): boolean {
        const re = /^\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/;
        return re.test(emailString || '') || emailString === "";
    }
}


/* EXAMPLE
<div id="channel-capture-container" class="channel-capture-container">
   <label>Email</label>
   <input><br>
   <span>Error Message</span><br>
   <label>Phone Number</label>
   <input><br><span>Error Message</span><br>
</div>
*/