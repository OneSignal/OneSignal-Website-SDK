import Environment from "./Environment";


export const DEV_HOST = 'https://oregon:3001';
export const DEV_FRAME_HOST = 'https://washington.localhost:3001';
export const DEV_PREFIX = 'Dev-';
export const PROD_HOST = 'https://onesignal.com';
export const STAGING_HOST = 'https://onesignal-staging.pw';
export const STAGING_FRAME_HOST = 'https://washington.onesignal-staging.pw';
export const STAGING_PREFIX = 'Staging-';

var HOST_URL;
var API_URL;
if (Environment.isDev()) {
    HOST_URL = DEV_HOST;
    API_URL = DEV_HOST + '/api/v1/';
} else if (Environment.isStaging()) {
    HOST_URL = STAGING_HOST;
    API_URL = STAGING_HOST + '/api/v1/';
} else {
    HOST_URL = PROD_HOST;
    API_URL = PROD_HOST + '/api/v1/';
}

export { HOST_URL, API_URL };