import { waitForAnimations } from 'src/shared/helpers/dom';
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

  get _active(): boolean {
    return !(this._element?.classList.contains('onesignal-bell-launcher-inactive') ?? false);
  }

  async _show() {
    const el = this._element;
    if (!el || this._shown) return;
    el.classList.add('onesignal-bell-launcher-active');
    await waitForAnimations(el);
  }

  async _hide() {
    const el = this._element;
    if (!el || !this._shown) return;
    el.classList.remove('onesignal-bell-launcher-active');
    await waitForAnimations(el);
  }

  async _activate() {
    const el = this._element;
    if (!el || this._active) return;
    el.classList.remove('onesignal-bell-launcher-inactive');
    await waitForAnimations(el);
  }

  async _inactivate() {
    const el = this._element;
    if (!el || !this._active) return;
    el.classList.add('onesignal-bell-launcher-inactive');
    el.classList.remove('onesignal-bell-no-tip');
    await waitForAnimations(el);
  }

  async _resize(size: BellSize) {
    const el = this._element;
    if (!el) throw new Error('Missing DOM element');

    const px = SIZE_PX[size];
    if (!px) throw new Error('Invalid OneSignal bell size ' + size);

    el.style.setProperty('--bell-size', `${px}px`);
    el.style.setProperty('--bell-inactive-scale', `${32 / px}`);
    el.style.setProperty('--badge-font-size', px <= 32 ? '8px' : '12px');

    if (this._shown) await waitForAnimations(el);
  }
}
