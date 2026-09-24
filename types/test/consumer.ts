import type { OneSignal } from '@onesignal/web-sdk-types';

const onLoaded = async (oneSignal: OneSignal) => {
  await oneSignal.init({
    appId: '00000000-0000-0000-0000-000000000000',
  });
  oneSignal.Notifications.addEventListener('click', (event) => event.notification.notificationId);
};

window.OneSignalDeferred = window.OneSignalDeferred ?? [];
window.OneSignalDeferred.push(onLoaded);
void window.OneSignal.init({
  appId: '00000000-0000-0000-0000-000000000000',
});
