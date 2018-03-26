import ExtendableEvent from "./ExtendableEvent";

export interface EventHandler {
  (event: ExtendableEvent): void;
}
