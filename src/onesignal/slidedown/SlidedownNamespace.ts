import { AutoPromptOptions } from "../../page/managers/PromptsManager";
import Context from "../../page/models/Context";
import Emitter, { EventHandler } from "../../shared/libraries/Emitter";
import { DelayedPromptType } from "../../shared/models/Prompts";

export class SlidedownNamespace {
  constructor(private context: Context) {}

  public async promptPush(options?: AutoPromptOptions): Promise<void> {
    await this.context.promptsManager.internalShowParticularSlidedown(DelayedPromptType.Push, options);
  }

  public async promptSms(options?: AutoPromptOptions): Promise<void> {
    await this.context.promptsManager.internalShowSmsSlidedown(options);
  }

  public async promptEmail(options?: AutoPromptOptions): Promise<void> {
    await this.context.promptsManager.internalShowEmailSlidedown(options);
  }

  public async promptSmsAndEmail(options?: AutoPromptOptions): Promise<void> {
    await this.context.promptsManager.internalShowSmsAndEmailSlidedown(options);
  }

  public async promptCategoryPush(options?: AutoPromptOptions): Promise<void> {
    await this.context.promptsManager.internalShowCategorySlidedown(options);
  }

  public on(event: "slidedownShown", listener: EventHandler): Emitter {
    // TO DO
  }
}
