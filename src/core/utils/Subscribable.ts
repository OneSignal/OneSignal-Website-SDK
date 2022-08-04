export default class Subscribable<MessageType> {
  protected subscribers: Set<(msg: MessageType) => void> = new Set<(msg: MessageType) => void>();

  constructor() {}

  /**
   * Subscribe to the message stream.
   * @param  {(msg:MessageType)=>void} callback
   */
  public subscribe(callback: (msg: MessageType) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Publish a message to the message stream.
   * @param msg The message to publish
   */
  protected broadcast(msg: MessageType) {
    this.subscribers.forEach(callback => {
      callback(msg);
    });
  }
}
