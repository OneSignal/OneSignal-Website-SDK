// Use self.location.origin so the worker imports from whichever origin
// served it (localhost during local dev, an ngrok/Cloudflare tunnel during
// device testing, etc.). Hardcoding localhost:4001 breaks any test that
// loads this worker from a non-localhost origin (the inner script is
// fetched as part of registration and produces a NetworkError otherwise).
importScripts(`${self.location.origin}/sdks/web/v16/Dev-OneSignalSDK.sw.js`);

// For testing on staging
// importScripts(
//   'https://cdn.staging.onesignal.com/sdks/web/v16/Staging-OneSignalSDK.sw.js',
// );
