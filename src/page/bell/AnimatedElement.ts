/**
 * Modern replacement for AnimatedElement using CSS transitions and Web Animations API
 */
export default class AnimatedElement {
  public _selector: string;
  protected _showClass?: string;
  protected _activeClass?: string;
  protected _inactiveClass?: string;
  protected _nestedContentSelector?: string;

  constructor(
    selector: string,
    showClass?: string,
    activeClass?: string,
    inactiveClass?: string,
    nestedContentSelector?: string,
  ) {
    this._selector = selector;
    this._showClass = showClass;
    this._activeClass = activeClass;
    this._inactiveClass = inactiveClass;
    this._nestedContentSelector = nestedContentSelector;
  }

  /**
   * Show element using CSS classes and wait for animations to complete
   */
  async _show(): Promise<AnimatedElement> {
    const element = this._element;
    if (!element || this._shown) {
      return this;
    }

    if (this._showClass) {
      element.classList.add(this._showClass);
    }

    await this._waitForAnimations();
    return this;
  }

  /**
   * Hide element using CSS classes and wait for animations to complete
   */
  async _hide(): Promise<AnimatedElement> {
    const element = this._element;
    if (!element || !this._shown) {
      return this;
    }

    if (this._showClass) {
      element.classList.remove(this._showClass);
    }

    await this._waitForAnimations();
    return this;
  }

  /**
   * Activate element using CSS classes
   */
  async _activate(): Promise<AnimatedElement> {
    const element = this._element;
    if (!element || this._active) {
      return this;
    }

    if (this._inactiveClass) {
      element.classList.remove(this._inactiveClass);
    }
    if (this._activeClass) {
      element.classList.add(this._activeClass);
    }

    await this._waitForAnimations();
    return this;
  }

  /**
   * Inactivate element using CSS classes
   */
  async _inactivate(): Promise<AnimatedElement> {
    const element = this._element;
    if (!element || !this._active) {
      return this;
    }

    if (this._activeClass) {
      element.classList.remove(this._activeClass);
    }
    if (this._inactiveClass) {
      element.classList.add(this._inactiveClass);
    }

    await this._waitForAnimations();
    return this;
  }

  /**
   * Wait for all CSS animations/transitions to complete
   */
  protected async _waitForAnimations(): Promise<void> {
    const element = this._element;
    if (!element) return;

    const animations = element.getAnimations();
    if (animations.length === 0) return;

    await Promise.allSettled(animations.map((animation) => animation.finished));
  }

  /**
   * Get or set element content
   */
  get _content(): string {
    const element = this._element;
    if (!element) return '';

    if (this._nestedContentSelector) {
      const nestedElement = element.querySelector(this._nestedContentSelector);
      return nestedElement?.textContent ?? '';
    }

    return element.textContent ?? '';
  }

  set _content(value: string) {
    const element = this._element;
    if (!element) return;

    if (this._nestedContentSelector) {
      const nestedElement = element.querySelector(this._nestedContentSelector);
      if (nestedElement) {
        nestedElement.textContent = value;
      }
    } else {
      element.textContent = value;
    }
  }

  /**
   * Get the DOM element (lazy-loaded)
   */
  get _element(): HTMLElement | null {
    return document.querySelector(this._selector);
  }

  /**
   * State getters
   */
  get _shown(): boolean {
    const element = this._element;
    return element?.classList.contains(this._showClass ?? '') ?? false;
  }

  get _active(): boolean {
    const element = this._element;
    if (this._inactiveClass) {
      return !(element?.classList.contains(this._inactiveClass) ?? false);
    }
    return element?.classList.contains(this._activeClass ?? '') ?? false;
  }
}
