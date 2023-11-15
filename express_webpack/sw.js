// Example of a root scope service worker a site might have.
// This tests to ensure OneSignal can use the correctly scoped one when
// 2 service workers are in play.

// This exists to point out the fact this service worker is being
// used instead of the intended OneSignalSDKWorker.js.
self.addEventListener('push', async (e) => {
  console.error("push - Should not fire on sw.js");

  const options = {
      body: 'Non-SDK from sw.js',
  };

  // Display notification
  const displayPromise = self.registration.showNotification('Non-SDK from sw.js', options);

  // Must wait for all promises to finish before return from this event.
  e.waitUntil(displayPromise);
});
