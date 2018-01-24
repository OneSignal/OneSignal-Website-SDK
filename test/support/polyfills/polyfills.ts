import fetch from 'node-fetch';
var global = new Function('return this')();

global.URL = require('./URL').URL;
global.indexedDB = require('fake-indexeddb');
global.Headers = require('./Headers');
global.fetch = fetch;
