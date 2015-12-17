if (typeof OneSignal !== "undefined")
  var predefinedOneSignalPushes = OneSignal;

require("expose?OneSignal!./sdk.js");

window.hihi = 'test';

if (predefinedOneSignalPushes)
  OneSignal._process_pushes(predefinedOneSignalPushes);
