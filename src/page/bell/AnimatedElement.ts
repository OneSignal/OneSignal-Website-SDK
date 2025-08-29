/**
 * Modern replacement for AnimatedElement using CSS transitions and Web Animations API
 */
export default class AnimatedElement {
  public selector: string;
  protected visibleClass?: string;
  protected activeClass?: string;
  protected inactiveClass?: string;
  protected nestedContentSelector?: string;

  constructor(
    selector: string,
    visibleClass?: string,
    activeClass?: string,
    inactiveClass?: string,
    nestedContentSelector?: string,
  ) {
    this.selector = selector;
    this.visibleClass = visibleClass;
    this.activeClass = activeClass;
    this.inactiveClass = inactiveClass;
    this.nestedContentSelector = nestedContentSelector;
  }

  /**
   * Show element using CSS classes and wait for animations to complete
   */
  async show(): Promise<AnimatedElement> {
    const element = this.element;
    if (!element || this.shown) {
      return this;
    }

    if (this.visibleClass) {
      element.classList.add(this.visibleClass);
    }

    await this.waitForAnimations();
    return this;
  }

  /**
   * Hide element using CSS classes and wait for animations to complete
   */
  async hide(): Promise<AnimatedElement> {
    const element = this.element;
    if (!element || this.hidden) {
      return this;
    }

    if (this.visibleClass) {
      element.classList.remove(this.visibleClass);
    }

    await this.waitForAnimations();
    return this;
  }

  /**
   * Activate element using CSS classes
   */
  async activate(): Promise<AnimatedElement> {
    const element = this.element;
    if (!element || this.active) {
      return this;
    }

    if (this.inactiveClass) {
      element.classList.remove(this.inactiveClass);
    }
    if (this.activeClass) {
      element.classList.add(this.activeClass);
    }

    await this.waitForAnimations();
    return this;
  }

  /**
   * Inactivate element using CSS classes
   */
  async inactivate(): Promise<AnimatedElement> {
    const element = this.element;
    if (!element || this.inactive) {
      return this;
    }

    if (this.activeClass) {
      element.classList.remove(this.activeClass);
    }
    if (this.inactiveClass) {
      element.classList.add(this.inactiveClass);
    }

    await this.waitForAnimations();
    return this;
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
    return element?.classList.contains(this.visibleClass ?? '') ?? false;
  }

  get hidden(): boolean {
    return !this.shown;
  }

  get active(): boolean {
    const element = this.element;
    if (this.inactiveClass) {
      return !(element?.classList.contains(this.inactiveClass) ?? false);
    }
    return element?.classList.contains(this.activeClass ?? '') ?? false;
  }

  get inactive(): boolean {
    return !this.active;
  }
}
