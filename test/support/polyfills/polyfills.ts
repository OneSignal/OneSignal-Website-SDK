import fetch from 'node-fetch';
const global = new Function('return this')();

global.URL = require('url').URL;
global.indexedDB = require('fake-indexeddb');
global.Headers = require('./Headers');
global.fetch = fetch;

global.btoa = function(str: string | Buffer) {
  let buffer;
  if (str instanceof Buffer)
    buffer = str;
  else
    buffer = new Buffer(str.toString(), 'binary');

  return buffer.toString('base64');
};
global.atob = function(str: string) {
  return new Buffer(str, 'base64').toString('binary');
};
