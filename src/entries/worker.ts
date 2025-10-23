/**
 * New clients will only be including this entry file, which will result in a reduced service worker size.
 */
import { run } from '../sw/serviceWorker/ServiceWorker';

// Need to call run() to ensure the service worker is registered but also to ensure the service worker is not tree-shaken
run();
