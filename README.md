[![Build Status](https://travis-ci.org/OneSignal/OneSignal-Website-SDK.svg?branch=master)](https://travis-ci.org/OneSignal/OneSignal-Website-SDK)

<p align="center">
  <img src="https://onesignal.com/assets/common/logo_onesignal_color.png"/>
  <br/>
    <br/>
  <img src="https://www.filepicker.io/api/file/FKy7xatlQeGqUuE9C3p8"/>
  <span style="color: grey !important">Showing web push notifications from Chrome, Safari, and Firefox</span>
</p>

# OneSignal Web Push SDK

[OneSignal](https://onesignal.com) is a free push notification service for web and mobile apps.

This SDK allows your site's visitors to receive push notifications from you. Send visitors custom notification content, target specific users, and send automatically based on triggers.


## Getting Started

View our [documentation](https://documentation.onesignal.com/docs/web-push-setup) to get started.

Please reference the OneSignal SDK on your webpage via our CDN URL (listed in our setup documentation) instead of copying the source into another file. This is because our SDK updates frequently for new features and bug fixes.


## Structure

`+-- assets/`

Sources for web SDK. `entry.js` is the entry point that requires other files.

`+-- src/`

Sources for web SDK. `entry.js` is the entry point that requires other files.

`+-- test/`

Sources for web SDK tests. `entry.js` is the entry point that requires other files.

`+-- dist/`

Contains the production (minified & mangled) and development versions of the transpiled web SDK as well as their separate source map `.map` files. Also contains the OneSignalSDKTests.js file, which is the ES6-transpiled-to-ES5 tests from all the `test/` source files.

## Contributing

1. `git clone git@github.com:one-signal/OneSignal-Website-SDK.git`
2. `npm install`
3. `npm install -g gulp webpack`  (installs `gulp` and `webpack` globally for use)
4. `gulp`

The `src/` and `test/` directories are watched and automatically re-transpiled when changed. The compiled SDK go to `dist/`. The compiled test sources go to `dist/OneSignalSDKTests.js`.
