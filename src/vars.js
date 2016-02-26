import Environment from './environment.js'

export const DEV_HOST = 'https://127.0.0.1:3001';
export const DEV_FRAME_HOST = 'https://localhost:3001';
// TODO: export const DEV_FRAME_HTTP_HOST = '';
// TODO: export const DEV_FRAME_HTTPS_HOST = '';
export const PROD_HOST = 'https://onesignal.com';
export const HOST_URL = (Environment.isDev() ? DEV_HOST : PROD_HOST);
export const API_URL = (Environment.isDev() ? DEV_HOST : PROD_HOST) + '/api/v1/';

// ⬸ ⤑