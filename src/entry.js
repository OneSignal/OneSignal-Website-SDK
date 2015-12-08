if (typeof OneSignal !== "undefined")
  var predefinedOneSignalPushes = OneSignal;

require("expose?OneSignal!./sdk.js");

if (predefinedOneSignalPushes)
  OneSignal._process_pushes(predefinedOneSignalPushes);
