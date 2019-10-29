export class MockEvent implements Event {
  readonly AT_TARGET: number = 0;
  readonly BUBBLING_PHASE: number = 0;
  readonly CAPTURING_PHASE: number = 0;
  readonly NONE: number = 0;
  readonly bubbles: boolean = true;
  cancelBubble: boolean = false;
  readonly cancelable: boolean = true;
  readonly currentTarget: EventTarget | null = null;
  readonly defaultPrevented: boolean = false;
  readonly eventPhase: number = 0;
  readonly isTrusted: boolean = true;
  returnValue: boolean = false;
  readonly scoped: boolean = false;
  readonly srcElement: Element | null = null;
  readonly target: EventTarget | null = null;
  readonly timeStamp: number = 0;
  readonly type: string;

  constructor(typeArg: string, _eventInitDict?: EventInit) {
    this.type = typeArg;
  }

  deepPath(): EventTarget[] {
    return [];
  }

  initEvent(_type: string, _bubbles?: boolean, _cancelable?: boolean): void {
  }

  preventDefault(): void {
  }

  stopImmediatePropagation(): void {
  }

  stopPropagation(): void {
  }

}
