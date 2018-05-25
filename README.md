# OneSignal Web Push SDK (mrf version)

## changelog
* sdf
* sdf

## checks
in chrome dev tools
```js
OneSignal.VERSION
// it should return 150200 (defined in package.json)
```

accept push notifications and send a push notification
```js
OneSignal.sendSelfNotification(
 /* Title (defaults if unset) */
 "OneSignal Web Push Notification",
 /* Message (defaults if unset) */
 "Action buttons increase the ways your users can interact with your notification.",
  /* URL (defaults if unset) */
 'https://example.com/?_osp=do_not_open',
 /* Icon */
 'https://onesignal.com/images/notification_logo.png',
 {
   /* Additional data hash */
   notificationType: 'news-feature'
 },
 [{ /* Buttons */
   /* Choose any unique identifier for your button. The ID of the clicked button is passed to you so you can identify which button is clicked */
   id: 'like-button',
   /* The text the button should display. Supports emojis. */
   text: 'Like',
   /* A valid publicly reachable URL to an icon. Keep this small because it's downloaded on each notification display. */
   icon: 'http://i.imgur.com/N8SN8ZS.png',
   /* The URL to open when this action button is clicked. See the sections below for special URLs that prevent opening any window. */
   url: 'https://example.com/?_osp=do_not_open'
 },
 {
   id: 'read-more-button',
   text: 'Read more',
   icon: 'http://i.imgur.com/MIxJp1L.png',
   url: 'https://example.com/?_osp=do_not_open'
 }]
);
```
