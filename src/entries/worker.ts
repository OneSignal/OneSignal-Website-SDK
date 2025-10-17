/**
 * New clients will only be including this entry file, which will result in a reduced service worker size.
 */
import { run } from '../sw/serviceWorker/ServiceWorker';

// The run() is already called in ServiceWorker.ts, but importing it ensures it's not tree-shaken
void run;
