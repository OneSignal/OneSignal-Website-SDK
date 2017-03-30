import { generateRandomId } from '../utils/generateRandomId';


// https://developer.mozilla.org/en-US/docs/Web/API/Client
export default class Client {
  constructor(url, frameType) {
    this.id = generateRandomId();
    this.url = url;
    this.frameType = frameType;
  }

  focus() {

  }

  async navigate(url) {
    this.url = url;
  }

  postMessage() {
    throw new Error('METHOD NOT IMPLEMENTED');
  }

  snapshot() {
    return {
      url: this.url,
      frameType: this.frameType
    };
  }
}