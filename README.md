<p align="center">
  <img src="https://media.onesignal.com/cms/Website%20Layout/logo-red.svg"/>
  <br/>
  <br/>
  <span style="color: grey !important">Showing web push notifications from Chrome, Safari, and Firefox</span>
</p>

# OneSignal Web Push SDK

[OneSignal](https://onesignal.com) is the market leader in customer engagement, powering mobile push, web push, email, and in-app messages.

This SDK allows your site's visitors to receive push notifications from you. Send visitors custom notification content, target specific users, and send automatically based on triggers.

## Getting Started

View our [documentation](https://documentation.onesignal.com/docs/web-push-quickstart) to get started.

Please reference the OneSignal SDK on your webpage via our CDN URL (listed in our setup documentation) instead of copying the source into another file. This is because our SDK updates frequently for new features and bug fixes.

## Local Development

Install the dependencies `npm install` then you can `npm run dev`. This will start a dev server on port 4001.
The code will use navigator register on OneSignalSDKWorker.js to register the code as service worker.

## Preview

To preview with the actual bundle you can run the build first e.g. `npm run build:dev` then cd into the `preview` folder and follow the instructions in that folder. But generally you can run `docker-compose up` or `npm start`.
