import fetch from 'node-fetch';
var global = new Function('return this')();

global.URL = require('./URL').URL;
global.indexedDB = require('fake-indexeddb');
global.Headers = require('./Headers');
global.fetch = fetch;
global.btoa = function(str) {
  var buffer
    ;

  if (str instanceof Buffer) {
    buffer = str;
  } else {
    buffer = new Buffer(str.toString(), 'binary');
  }

  return buffer.toString('base64');
};
global.atob = function(str) {
  return new Buffer(str, 'base64').toString('binary');
};
