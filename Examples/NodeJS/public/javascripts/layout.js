OneSignal.push(['setDefaultNotificationUrl', 'http://localhost:3000/index2']);
OneSignal.push(['setDefaultIcon', 'images/OneSignal_icon.png']);

// Enable logging to debug any issues.
// OneSignal.push(function() { OneSignal.LOGGING = true; });

// If your site is non-HTTPS please uncomment the line below and comment out the default init.
//   Also update the subdomainName parameter with the domain you entered on our dashboard prefixed with 's-'.
//OneSignal.push(["init" , {appId: "5eb5a37e-b458-11e3-ac11-000c2940e62c", subdomainName: "s-onesignalexample"}]);
OneSignal.push(["init" , {appId: "5eb5a37e-b458-11e3-ac11-000c2940e62c"}]);