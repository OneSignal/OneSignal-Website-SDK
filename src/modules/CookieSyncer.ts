import * as log from 'loglevel';

export default class CookieSyncer {

  private isFeatureEnabled: boolean;

  constructor(isFeatureEnabled: boolean) {
    this.isFeatureEnabled = isFeatureEnabled;
  }

  static get SYNC_URL() {
    return 'https://rc.rlcdn.com/463096.gif?n=5';
  }
  static get DOM_ID() {
    return 'onesignal-cookie-sync';
  }

  getElement() {
    return document.getElementById(CookieSyncer.DOM_ID);
  }

  uninstall() {
    if (this.getElement()) {
      this.getElement().remove();
    }
  }

  install() {
    if (!this.isFeatureEnabled) {
      log.debug('Cookie sync feature is disabled.');
      return;
    }
    this.uninstall();
    const domElement = document.createElement('img');
    domElement.setAttribute('id', CookieSyncer.DOM_ID);
    domElement.setAttribute('border', '0');
    domElement.setAttribute('hspace', '0');
    domElement.setAttribute('vspace', '0');
    domElement.setAttribute('width', '1');
    domElement.setAttribute('height', '1');
    domElement.setAttribute('src', CookieSyncer.SYNC_URL);
    document.querySelector('body').appendChild(domElement);
    log.debug('Enabled cookie sync feature.');
  }
}
