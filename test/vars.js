import { DEV_HOST, PROD_HOST, HOST_URL } from '../src/vars.js';
import { isDev } from '../src/utils.js';

export var APP_ID = isDev() ? '33b3562a-d33b-42ee-88bc-1436e780311f' : '7b6053e0-9911-4003-a0a4-a33e417ad663';
export var PLAYER_ID = isDev() ? 'b3481557-521d-4d01-be72-acf2c3f46eff' : '15b23511-e0cf-489a-8682-7cf129cb4585';