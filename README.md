# OneSignal Web Push SDK (mrf version)

branch from the **marfeel** branch, and merge into it.

this branch will be rebased with OneSignal's OneSignal-Website-SDK master

generate bundle
```sh
# generate the bundle
npm run build:prod

# move it to XP
cp ./build/bundles/OneSignalSDK.js $MARFEELXP_HOME/Tenants/vhosts/marfeel/resources/pushNotifications/OneSignalSDK.js
```

## checks
in chrome dev tools (remember that Push notifications do not work in incognito)

```js
OneSignal.VERSION
// it should return 150200 (defined in package.json)
```

accept push notifications and send a push notification
```js
OneSignal.sendSelfNotification(
 /* Title (defaults if unset) */ "Title",
 /* Message (defaults if unset) */ "Text",
  /* URL (defaults if unset) */ 'https://example.com/?_osp=do_not_open',
 /* Icon */ 'https://onesignal.com/images/notification_logo.png'
);
```

## mrf changelog
* update package.json and return always the sdk version specified in the package.json config [PR](https://github.com/Marfeel/OneSignal-Website-SDK/pull/1)
* get AppId from indexedDB instead of the qureyparams [PR](https://github.com/Marfeel/OneSignal-Website-SDK/pull/3)
