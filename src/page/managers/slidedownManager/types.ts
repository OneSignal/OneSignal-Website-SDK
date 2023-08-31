import Slidedown from '../../slidedown/Slidedown';
import { AutoPromptOptions } from '../PromptsManager';

export interface ISlidedownManager {
  slidedown?: Slidedown;
  setIsSlidedownShowing: (isShowing: boolean) => void;
  showQueued: () => Promise<void>;
  createSlidedown: (options: AutoPromptOptions) => Promise<void>;
  handleAllowClick: () => Promise<void>;
}
