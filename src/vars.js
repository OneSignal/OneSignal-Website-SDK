import Environment from './environment.js';

export const DEV_HOST = 'https://oregon:3001';
export const DEV_FRAME_HOST = 'https://washington.localhost:3001';
export const PROD_HOST = 'https://onesignal.com';
export const STAGING_HOST = 'https://onesignal-staging.pw';
export const STAGING_FRAME_HOST = 'https://washington.onesignal-staging.pw';

if (Environment.isDev()) {
    var HOST_URL = DEV_HOST;
    var API_URL = DEV_HOST + '/api/v1/';
} else if (Environment.isStaging()) {
    var HOST_URL = STAGING_HOST;
    var API_URL = STAGING_HOST + '/api/v1/';
} else {
    var HOST_URL = PROD_HOST;
    var API_URL = PROD_HOST + '/api/v1/';
}

export { HOST_URL, API_URL };