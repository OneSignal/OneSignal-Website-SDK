# OneSignal Web Push SDK

OneSignal is a free push notification service for web and mobile apps.

This SDK allows your site's visitors to receive push notifications from you. Send visitors custom notification content, target specific users, and send automatically based on triggers.

View our [website](https://onesignal.com) and our [documentation](https://documentation.onesignal.com/docs/website-sdk-overview) to get started. This repository always matches our latest Web SDK `onesignal.com/OneSignalSDK.js`.

## Structure

`+-- src/`

Sources for web SDK. `entry.js` is the entry point that requires other files.

`+-- test/`

Sources for web SDK tests. `entry.js` is the entry point that requires other files.

`+-- dist/`

Contains the production (minified) and development versions of the transpiled web SDK as well as their separate source map `.map` files. Also contains the test.js file, which is the ES6-transpiled-to-ES5 tests from all the `test/` source files.

## Contributing

1. `git clone git@github.com:one-signal/OneSignal-Website-SDK.git`
2. `npm install`
3. `npm install -g gulp webpack`  (installs `gulp` and `webpack` globally for use)
4. `gulp`

The `src/` and `test/` directories are watched and automatically re-transpiled when changed. The compiled SDK go to `dist/`. The compiled test sources go to `dist/test.js`.

## Testing

Run `dist/test.html`, which loads and runs `test.js`.