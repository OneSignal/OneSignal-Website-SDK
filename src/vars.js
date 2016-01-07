import { isDev } from './utils.js';

export const DEV_HOST = 'https://127.0.0.1:3001';
export const DEV_FRAME_HOST = 'https://localhost:3001';
export const PROD_HOST = 'https://onesignal.com';
export const HOST_URL = (isDev() ? DEV_HOST : PROD_HOST);
export const API_URL = (isDev() ? DEV_HOST : PROD_HOST) + '/api/v1/';

// ⬸ ⤑