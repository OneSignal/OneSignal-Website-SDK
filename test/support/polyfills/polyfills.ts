var global = new Function('return this')();

global.URL = require('./URL').URL;
global.indexedDB = require('fake-indexeddb');
