import { addCssClass, removeCssClass, waitForAnimations } from 'src/shared/helpers/dom';
import type { BellSize } from 'src/shared/prompts/types';
import type Bell from './Bell';

const SIZE_CLASSES: Record<BellSize, string> = {
  small: 'onesignal-bell-launcher-sm',
  medium: 'onesignal-bell-launcher-md',
  large: 'onesignal-bell-launcher-lg',
};

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

    const targetClass = SIZE_CLASSES[size];
    if (!targetClass) throw new Error('Invalid OneSignal bell size ' + size);
    if (el.classList.contains(targetClass)) return;

    for (const cls of Object.values(SIZE_CLASSES)) {
      removeCssClass(el, cls);
    }
    addCssClass(el, targetClass);

    if (this._shown) await waitForAnimations(el);
  }
}
