import "./sdk.js";
import log from 'loglevel';

// Let's see all errors
log.setDefaultLevel('trace');

require("expose?OneSignal!./sdk.js");