import type { BellSize } from 'src/shared/prompts/types';
import type Bell from './Bell';

const SIZE_PX: Record<BellSize, number> = { small: 32, medium: 48, large: 64 };

export default class Launcher {
  public _bell: Bell;
  public _selector = '.onesignal-bell-launcher';

  constructor(bell: Bell) {
    this._bell = bell;
  }

  get _element(): HTMLElement | null {
    return document.querySelector(this._selector);
  }

  get _shown(): boolean {
    return this._element?.classList.contains('onesignal-bell-launcher-active') ?? false;
  }

  _show(): void {
    const el = this._element;
    if (!el || this._shown) return;
    el.classList.add('onesignal-bell-launcher-active');
  }

  _hide(): void {
    const el = this._element;
    if (!el || !this._shown) return;
    this._bell._dialog._hide();
    el.classList.remove('onesignal-bell-launcher-active');
  }

  _resize(size: BellSize): void {
    const el = this._element;
    if (!el) throw new Error('Missing DOM element');

    const px = SIZE_PX[size];
    if (!px) throw new Error('Invalid OneSignal bell size ' + size);

    el.style.setProperty('--bell-size', `${px}px`);
    el.style.setProperty('--bell-resting-scale', `${32 / px}`);
    el.style.setProperty('--badge-font-size', px <= 32 ? '8px' : '12px');
  }
}
