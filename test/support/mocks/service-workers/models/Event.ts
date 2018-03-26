import NotImplementedError from '../../../../../src/errors/NotImplementedError';

export default class Event {
  readonly bubbles: boolean;
  readonly cancelable: boolean;
  cancelBubble: boolean;
  readonly currentTarget: EventTarget;
  readonly defaultPrevented: boolean;
  readonly eventPhase: number;
  readonly isTrusted: boolean;
  returnValue: boolean;
  readonly srcElement: Element | null;
  readonly target: EventTarget;
  readonly timeStamp: number;
  readonly type: string;
  readonly scoped: boolean;
  readonly AT_TARGET: number;
  readonly BUBBLING_PHASE: number;
  readonly CAPTURING_PHASE: number;

  constructor(eventName: string) {
    this.type = eventName;
  }

  initEvent(eventTypeArg: string, canBubbleArg: boolean, cancelableArg: boolean): void {
  }

  preventDefault(): void {
  }

  stopImmediatePropagation(): void {
  }

  stopPropagation(): void {

  }

  deepPath(): EventTarget[] {
    return [];
  }
}
