export class MockPushMessageData implements PushMessageData {
  private data?: object;

  public constructor(data?: object) {
    this.data = data;
  }

  arrayBuffer(): ArrayBuffer {
    throw new Error('Method not implemented.');
  }
  blob(): Blob {
    throw new Error('Method not implemented.');
  }
  json(): any {
    return this.data;
  }
  text(): string {
    throw new Error('Method not implemented.');
  }
}
