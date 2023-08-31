import Environment from '../helpers/Environment';

export class BrowserUtils {
  private static decodeTextArea: HTMLTextAreaElement | null = null;
  public static decodeHtmlEntities(text: string) {
    if (Environment.isBrowser()) {
      if (!BrowserUtils.decodeTextArea) {
        BrowserUtils.decodeTextArea = document.createElement('textarea');
      }
    }
    if (BrowserUtils.decodeTextArea) {
      BrowserUtils.decodeTextArea.innerHTML = text;
      return BrowserUtils.decodeTextArea.value;
    } else {
      // Not running in a browser environment, text cannot be decoded
      return text;
    }
  }
}

export default BrowserUtils;
