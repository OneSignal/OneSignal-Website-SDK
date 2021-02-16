import { AutoPromptOptions } from "../PromptsManager";

export interface ISlidedownManager {
    setIsSlidedownShowing: (isShowing: boolean) => void;
    showQueued: () => Promise<void>;
    createSlidedown: (options: AutoPromptOptions) => Promise<void>;
}