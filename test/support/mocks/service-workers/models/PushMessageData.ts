export default class PushMessageData {
  constructor(
    private data: any
  ) { }

  arrayBuffer(): ArrayBuffer {
    throw new Error("not implemented");
  }

  blob(): Blob {
    throw new Error("not implemented");
  }

  json(): any {
    return JSON.parse(this.data);
  }

  text(): string {
    if (this.data || this.data === false) {
      return this.data.toString();
    }
    else return this.data;
  }
}
