/**
 * Modern replacement for AnimatedElement using CSS transitions and Web Animations API
 */
export default class AnimatedElement {
  public selector: string;
  protected showClass?: string;
  protected activeClass?: string;
  protected inactiveClass?: string;
  protected nestedContentSelector?: string;

  constructor(
    selector: string,
    showClass?: string,
    activeClass?: string,
    inactiveClass?: string,
    nestedContentSelector?: string,
  ) {
    this.selector = selector;
    this.showClass = showClass;
    this.activeClass = activeClass;
    this.inactiveClass = inactiveClass;
    this.nestedContentSelector = nestedContentSelector;
  }

  /**
   * Show element using CSS classes and wait for animations to complete
   */
  async show(): Promise<void> {
    const element = this.element;
    if (!element || this.shown) {
      return;
    }

    if (this.showClass) {
      element.classList.add(this.showClass);
    }

    await this.waitForAnimations();
  }

  /**
   * Hide element using CSS classes and wait for animations to complete
   */
  async hide(): Promise<void> {
    const element = this.element;
    if (!element || !this.shown) {
      return;
    }

    if (this.showClass) {
      element.classList.remove(this.showClass);
    }

    await this.waitForAnimations();
  }

  /**
   * Activate element using CSS classes
   */
  async activate(): Promise<void> {
    const element = this.element;
    if (!element || this.active) {
      return;
    }

    if (this.inactiveClass) {
      element.classList.remove(this.inactiveClass);
    }
    if (this.activeClass) {
      element.classList.add(this.activeClass);
    }

    await this.waitForAnimations();
  }

  /**
   * Inactivate element using CSS classes
   */
  async inactivate(): Promise<void> {
    const element = this.element;
    if (!element || !this.active) {
      return;
    }

    if (this.activeClass) {
      element.classList.remove(this.activeClass);
    }
    if (this.inactiveClass) {
      element.classList.add(this.inactiveClass);
    }

    await this.waitForAnimations();
  }

  /**
   * Wait for all CSS animations/transitions to complete
   */
  protected async waitForAnimations(): Promise<void> {
    const element = this.element;
    if (!element) return;

    const animations = element.getAnimations();
    if (animations.length === 0) return;

    await Promise.allSettled(animations.map((animation) => animation.finished));
  }

  /**
   * Get or set element content
   */
  get content(): string {
    const element = this.element;
    if (!element) return '';

    if (this.nestedContentSelector) {
      const nestedElement = element.querySelector(this.nestedContentSelector);
      return nestedElement?.textContent ?? '';
    }

    return element.textContent ?? '';
  }

  set content(value: string) {
    const element = this.element;
    if (!element) return;

    if (this.nestedContentSelector) {
      const nestedElement = element.querySelector(this.nestedContentSelector);
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
  get element(): HTMLElement | null {
    return document.querySelector(this.selector);
  }

  /**
   * State getters
   */
  get shown(): boolean {
    const element = this.element;
    return element?.classList.contains(this.showClass ?? '') ?? false;
  }

  get active(): boolean {
    const element = this.element;
    if (this.inactiveClass) {
      return !(element?.classList.contains(this.inactiveClass) ?? false);
    }
    return element?.classList.contains(this.activeClass ?? '') ?? false;
  }
}
