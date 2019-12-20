import { ContextSWInterface } from "../models/ContextSW";

export class SessionManager {
  private context: ContextSWInterface;

  constructor(context: ContextSWInterface) {
    this.context = context;
  }
}
