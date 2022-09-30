import { AutoPromptOptions } from "../../page/managers/PromptsManager";

type SlidedownEventObject = any; // TO DO

export interface SlidedownNamespace {
  promptSms: (options?: AutoPromptOptions) => void;
  promptEmail: (options?: AutoPromptOptions) => void;
  promptSmsAndEmail: (options?: AutoPromptOptions) => void;
  promptPush: (options?: AutoPromptOptions) => void;
  promptCategoryPush: (options?: AutoPromptOptions) => void;
  on: (event: "slidedownShown", callback: (event: SlidedownEventObject) => void) => void;
}
