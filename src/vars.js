import Environment from './environment.js';

export const DEV_HOST = 'https://oregon:3001';
export const DEV_FRAME_HOST = 'https://washington.localhost:3001';
export const PROD_HOST = 'https://onesignal.com';
export const HOST_URL = (Environment.isDev() ? DEV_HOST : PROD_HOST);
export const API_URL = (Environment.isDev() ? DEV_HOST : PROD_HOST) + '/api/v1/';