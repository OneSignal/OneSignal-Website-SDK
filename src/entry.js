import "./sdk.js";

require("expose?OneSignal!./sdk.js");

if (_temp_OneSignal)
  OneSignal._process_pushes(_temp_OneSignal);