import { DEV_HOST, PROD_HOST, API_URL } from '../src/vars.js';
import Environment from '../src/environment.js'

export var APP_ID = Environment.isDev() ? '62600226-1871-4ed9-818e-1b528280306e' : '7b6053e0-9911-4003-a0a4-a33e417ad663';
export var PLAYER_ID = Environment.isDev() ? '452a8968-85e0-4135-a8c2-07f9af60f327' : '15b23511-e0cf-489a-8682-7cf129cb4585';