export enum WipNaming {
  /**
   * An secure HTTPS site using its own origin for subscribing.
   */
  Secure = "None",
  /**
   * A secure HTTPS site using a proxy subscription origin (e.g. subdomain.os.tc or
   * subdomain.onesignal.com).
   */
  SecureProxy = "Secure Proxy",
  /**
   * An insecure HTTP site using a proxy subscription origin (e.g. subdomain.os.tc or
   * subdomain.onesignal.com).
   */
  InsecureProxy = "Insecure Proxy",
}
