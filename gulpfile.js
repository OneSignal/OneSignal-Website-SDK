var fs = require('fs');
var gulp = require("gulp");
var shell = require('gulp-shell');
var rename = require("gulp-rename");
var runSequence = require('run-sequence');
var clip = require('gulp-clip-empty-files');
var HOME_PATH = process.env.HOME;

var oneSignalSourceDir = HOME_PATH + "/code/OneSignal";
var IS_PRODUCTION_BUILD = process.argv.indexOf('--production') >= 0 || false;
var IS_STAGING_BUILD = process.argv.indexOf('--staging') >= 0 || false;
var IS_TEST_BUILD = process.argv.indexOf('--test') >= 0 || false;
var targetFolder = IS_PRODUCTION_BUILD ? 'sdks' : 'sdks';


gulp.task("default", function() {
  runSequence(['reload-changes', 'transpile-javascript']);
});

gulp.task("reload-changes", ['copy-js-sdk', 'copy-js-sdk-tests'], function() {
  gulp.watch('dist/OneSignalSDK.js', ['copy-js-sdk']);
  gulp.watch('dist/OneSignalSDKTests.js', ['copy-js-sdk-tests']);
});

gulp.task("transpile-javascript", shell.task([
  'webpack --progress --sort-assets-by --watch --colors ' + (IS_PRODUCTION_BUILD ? '--production' : '') + ' ' + (IS_TEST_BUILD ? '--test' : '') + ' ' + (IS_STAGING_BUILD ? '--staging' : '')
]));

function copyFile(prefix) {
  // Copy to OneSignal's public/sdks/OneSignalSDK.js
  gulp.src("./dist/OneSignalSDK.js")
      .pipe(clip())
      .pipe(rename("/" + prefix + "OneSignalSDK.js"))
      .pipe(gulp.dest(oneSignalSourceDir + "/public/" + targetFolder));

  if (fs.existsSync("./dist/OneSignalSDK.js.map")) {
    gulp.src("./dist/OneSignalSDK.js.map")
        .pipe(clip())
        .pipe(rename("/" + prefix + "OneSignalSDK.js.map"))
        .pipe(gulp.dest(oneSignalSourceDir + "/public/" + targetFolder));
  }

  // Copy to OneSignal's public/sdks/OneSignalSDKWorker.js
  // Copy to OneSignal's public/OneSignalSDKWorker.js
  gulp.src("./dist/OneSignalSDK.js")
      .pipe(clip())
      .pipe(rename("/" + prefix + "OneSignalSDKWorker.js"))
      .pipe(gulp.dest(oneSignalSourceDir + "/public/"))
      .pipe(gulp.dest(oneSignalSourceDir + "/public/" + targetFolder));

  if (fs.existsSync("./dist/OneSignalSDK.js.map")) {
    gulp.src("./dist/OneSignalSDK.js.map")
        .pipe(clip())
        .pipe(rename("/" + prefix + "OneSignalSDKWorker.js.map"))
        .pipe(gulp.dest(oneSignalSourceDir + "/public/"))
        .pipe(gulp.dest(oneSignalSourceDir + "/public/" + targetFolder));
  }

  // Copy to OneSignal's public/OneSignalSDKUpdaterWorker.js
  gulp.src("./dist/OneSignalSDK.js")
      .pipe(clip())
      .pipe(rename("/" + prefix + "OneSignalSDKUpdaterWorker.js"))
      .pipe(gulp.dest(oneSignalSourceDir + "/public/"));

  if (fs.existsSync("./dist/OneSignalSDK.js.map")) {
    gulp.src("./dist/OneSignalSDK.js.map")
        .pipe(clip())
        .pipe(rename("/" + prefix + "OneSignalSDKUpdaterWorker.js.map"))
        .pipe(gulp.dest(oneSignalSourceDir + "/public/"));
  }
}

/*
 Creates:
 - OneSignal/public/sdks/OneSignalSDK.js
 - OneSignal/public/sdks/OneSignalSDKWorker.js
 - OneSignal/public/OneSignalSDKWorker.js
 - OneSignal/public/OneSignalSDKUpdaterWorker.js

 These files contain the full contents of the web SDK.

 Previously, these files only contained importScripts(...), but after the change to sdks_controller which changed
 the web push modal URL from 'https://onesignal.com/sdks/initOneSignalHttp' to 'https://onesignal.com/subscribe',
 for HTTP sites, the web SDK would incorrectly register 'https://onesignal.com/OneSignalSDKWorker.js' for its
 service worker file, when it should actually be registering the original file
 'https://onesignal.com/sdks/OneSignalSDKWorker.js'. The solution is to make
 'https://onesignal.com/OneSignalSDKWorker.js' and 'OneSignalSDKUpdaterWorker.js' contain the full contents as well.
 */
gulp.task("copy-js-sdk", function() {
  copyFile('Dev-');
  if (IS_PRODUCTION_BUILD) {
    copyFile(''); // No prefix for production
  }
  if (IS_STAGING_BUILD) {
    copyFile('Staging-');
  }
});

gulp.task("copy-js-sdk-tests", function() {
  if (IS_TEST_BUILD) {
    gulp.src("./dist/OneSignalSDKTests.js")
        .pipe(clip())
        .pipe(rename("/OneSignalSDKTests.js"))
        .pipe(gulp.dest(oneSignalSourceDir + "/public/" + targetFolder));

    if (fs.existsSync("./dist/OneSignalSDKTests.js.map")) {
      gulp.src("./dist/OneSignalSDKTests.js.map")
          .pipe(clip())
          .pipe(rename("/OneSignalSDKTests.js.map"))
          .pipe(gulp.dest(oneSignalSourceDir + "/public/" + targetFolder));
    }
  }
});
