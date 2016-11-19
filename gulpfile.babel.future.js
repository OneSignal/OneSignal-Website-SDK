import nconf from 'nconf';
import gulp from 'gulp';

nconf.argv()
     .env()
     .file({ file: 'config.json' });