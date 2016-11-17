var fs = require('fs');
var gulp = require("gulp");
var shell = require('gulp-shell');
var rename = require("gulp-rename");
var runSequence = require('run-sequence');
var clip = require('gulp-clip-empty-files');
var HOME_PATH = process.env.HOME;

var oneSignalProjectRoot = HOME_PATH + "/code/OneSignal";
var oneSignalSdksDirName = 'sdks';
var publicAssetsTargetPath = oneSignalProjectRoot + "/public/";
var sdksTargetPath = publicAssetsTargetPath + oneSignalSdksDirName;
var IS_PROD = process.argv.indexOf('--prod') >= 0 || process.argv.indexOf('--production') >= 0 || false;
var IS_STAGING = process.argv.indexOf('--staging') >= 0 || false;
var IS_TEST = process.argv.indexOf('--test') >= 0 || false;
var IS_DEV = !IS_PROD && !IS_STAGING;

/**
 * Returns Dev- for dev builds, Staging- for staging builds.
 */
function getBuildPrefix() {
  if (IS_STAGING) {
    return 'Staging-';
  } else if (IS_DEV) {
    return 'Dev-';
  } else {
    return '';
  }
}


gulp.task("default", function() {
  runSequence(['reload-changes', 'transpile-javascript']);
});

gulp.task("reload-changes", ['copy-js-sdk', 'copy-js-sdk-tests'], function() {
  gulp.watch('dist/' + getBuildPrefix() + 'OneSignalSDK.js', ['copy-js-sdk']);
  gulp.watch('dist/' + getBuildPrefix() + 'OneSignalSDKTests.js', ['copy-js-sdk-tests']);
});

gulp.task("transpile-javascript", shell.task([
  'webpack --progress --sort-assets-by --watch --colors ' +
  (IS_PROD ? '--production' : '') + ' ' +
  (IS_TEST ? '--test' : '') + ' ' +
  (IS_STAGING ? '--staging' : '')
]));

function copyFile(prefix) {
  // Copy: dist/OneSignalSDK.js  ==>  OneSignal/public/sdks/OneSignalSDK.js
  gulp.src("./dist/" + prefix + "OneSignalSDK.js")
      .pipe(clip())
      .pipe(gulp.dest(sdksTargetPath));

  // Copy: dist/OneSignalSDK.js.map  ==>  OneSignal/public/sdks/OneSignalSDK.js.map
  if (fs.existsSync("./dist/" + prefix + "OneSignalSDK.js.map")) {
    gulp.src("./dist/" + prefix + "OneSignalSDK.js.map")
        .pipe(clip())
        .pipe(gulp.dest(sdksTargetPath));
  }

  // Rename: dist/OneSignalSDK.js  ==>  dist/OneSignalSDKWorker.js
  //   ->  Copy: dist/OneSignalSDKWorker.js  ==>  OneSignal/public/OneSignalSDKWorker.js
  //   ->  Copy: dist/OneSignalSDKWorker.js  ==>  OneSignal/public/sdks/OneSignalSDKWorker.js
  gulp.src("./dist/" + prefix +  "OneSignalSDK.js")
      .pipe(clip())
      .pipe(rename("/" + prefix + "OneSignalSDKWorker.js"))
      .pipe(gulp.dest(publicAssetsTargetPath))
      .pipe(gulp.dest(sdksTargetPath));

  // Rename: dist/OneSignalSDK.js.map  ==>  dist/OneSignalSDKWorker.js.map
  //   ->  Copy: dist/OneSignalSDKWorker.js.map  ==>  OneSignal/public/OneSignalSDKWorker.js.map
  //   ->  Copy: dist/OneSignalSDKWorker.js.map  ==>  OneSignal/public/sdks/OneSignalSDKWorker.js.map
  if (fs.existsSync("./dist/" + prefix + "OneSignalSDK.js.map")) {
    gulp.src("./dist/" + prefix + "OneSignalSDK.js.map")
        .pipe(clip())
        .pipe(rename("/" + prefix + "OneSignalSDKWorker.js.map"))
        .pipe(gulp.dest(publicAssetsTargetPath))
        .pipe(gulp.dest(sdksTargetPath));
  }

  // Rename: dist/OneSignalSDK.js  ==>  dist/OneSignalSDKUpdaterWorker.js
  //   ->  Copy: dist/OneSignalSDKUpdaterWorker.js  ==>  OneSignal/public/OneSignalSDKUpdaterWorker.js
  gulp.src("./dist/" + prefix + "OneSignalSDK.js")
      .pipe(clip())
      .pipe(rename("/" + prefix + "OneSignalSDKUpdaterWorker.js"))
      .pipe(gulp.dest(publicAssetsTargetPath));

  // Rename: dist/OneSignalSDK.js.map  ==>  dist/OneSignalSDKUpdaterWorker.js.map
  //   ->  Copy: dist/OneSignalSDKUpdaterWorker.js.map  ==>  OneSignal/public/OneSignalSDKUpdaterWorker.js.map
  if (fs.existsSync("./dist/" + prefix + "OneSignalSDK.js.map")) {
    gulp.src("./dist/" + prefix + "OneSignalSDK.js.map")
        .pipe(clip())
        .pipe(rename("/" + prefix + "OneSignalSDKUpdaterWorker.js.map"))
        .pipe(gulp.dest(publicAssetsTargetPath));
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
  copyFile(getBuildPrefix());
});

gulp.task("copy-js-sdk-tests", function() {
  if (IS_TEST) {
    gulp.src("./dist/" + getBuildPrefix() + "OneSignalSDKTests.js")
        .pipe(clip())
        .pipe(gulp.dest(sdksTargetPath));

    if (fs.existsSync("./dist/" + getBuildPrefix() + "OneSignalSDKTests.js.map")) {
      gulp.src("./dist/" + getBuildPrefix() + "OneSignalSDKTests.js.map")
          .pipe(clip())
          .pipe(gulp.dest(sdksTargetPath));
    }
  }
});
