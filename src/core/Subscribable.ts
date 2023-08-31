export default class Subscribable<MessageType> {
  protected subscribers = new Set<(msg: MessageType) => void>();

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
  public broadcast(msg: MessageType) {
    this.subscribers.forEach((callback) => {
      callback(msg);
    });
  }
}
