## Self Hosting the JavaScript Web SDK

[Please see our Wiki article on self-hosting our JavaScript web SDK](https://github.com/OneSignal/OneSignal-Website-SDK/wiki/Self-Hosting-the-JavaScript-Web-SDK/_edit).

**We strongly recommend [using our official SDK](https://cdn.onesignal.com/sdks/OneSignalSDK.js) hosted by CloudFlare's international CDN** instead of hosting the SDK on your own.

---

#### Directory Contents

- `OneSignalSDK.js`

    This is the main JavaScript web SDK file. It is also contains the service worker's code.
    
- `OneSignalSDK.js.map`

    This is the source map file, mapping the transpiled ES5 JavaScript code back to the original TypeScript source code.
