import { DEV_HOST, PROD_HOST, API_URL } from '../src/vars.js';
import Environment from '../src/environment.js'

export var APP_ID = Environment.isDev() ? (location.protocol === 'https:' ? '2ed062be-0ea9-45db-ad01-f28a0820a7ea' : '2b49220d-0933-4f86-b99b-cda87a1a7e2e') : '7b6053e0-9911-4003-a0a4-a33e417ad663';
export var PLAYER_ID = Environment.isDev() ? '6c71d09a-d825-421e-9cc4-52138b8e15ba' : '15b23511-e0cf-489a-8682-7cf129cb4585';
export var SUBDOMAIN = 'washington';

/* Web SDK Test Chrome Extension Variables */

// The Chrome extension ID, which stays consistent due to our setting the key property of the extension's manifest.json
export var EXT_ID = "engiogdknecmkikekehomfbhnneekmng";