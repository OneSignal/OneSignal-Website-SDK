var gulp = require("gulp");
var gutil = require('gulp-util');
var shell = require('gulp-shell');
var rename = require("gulp-rename");
var runSequence = require('run-sequence');
var livereload = require('gulp-livereload');

var oneSignalSourceDir = "/Users/jpang/code/OneSignal";
var IS_PRODUCTION_BUILD = process.argv.indexOf('--production') >= 0 || false;


gulp.task("default", ["main-task"]);

gulp.task("main-task", function() {
  runSequence(['serve-files', 'reload-changes', 'transpile-javascript']);
});

gulp.task("serve-files", function() {
  var express = require('express');
  var https = require('https');
  var http = require('http');
  var fs = require('fs');

// This line is from the Node.js HTTPS documentation.
  var options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
  };

// Create a service (the app object is just a callback).
  var app = express();

  app.use(express.static('public'));

// Create an HTTP service.
  http.createServer(app).listen(8080);
// Create an HTTPS service identical to the HTTP service.
  https.createServer(options, app).listen(8181);
});

gulp.task("reload-changes", ['reload-html', 'reload-js', 'reload-manifest'], function() {
  livereload.listen({start: true});
  gulp.watch('src/*.html', ['reload-html']);
  gulp.watch('dist/*.js', ['reload-js']);
  gulp.watch('src/manifest.json', ['reload-manifest']);
});

gulp.task("transpile-javascript", shell.task([
  'webpack --watch --colors ' + (IS_PRODUCTION_BUILD ? '--production-build' : '')
]));

gulp.task("reload-html", function() {
  gutil.log('HTML files changed.');
  gulp.src('src/*.html')
    .pipe(gulp.dest('public'))
    .pipe(livereload());
});

gulp.task("reload-js", function() {
  gutil.log('JavaScript files changed.');
  gulp.src('dist/*.js')
    .pipe(gulp.dest('public'));

  gulp.src("./public/OneSignalSDK.js")
    .pipe(rename("/OneSignalSDKWorker.js"))
    .pipe(gulp.dest("./public"))
    .pipe(livereload());

  if (IS_PRODUCTION_BUILD) {
    // Copy to OneSignal's public/dev_sdks/OneSignalSDK.js
    gulp.src("./dist/OneSignalSDK.js")
      .pipe(gulp.dest(oneSignalSourceDir + "/public/sdks"));

    // Copy to OneSignal's public/dev_sdks/OneSignalSDKWorker.js
    gulp.src("./dist/OneSignalSDK.js")
      .pipe(rename("/OneSignalSDKWorker.js"))
      .pipe(gulp.dest(oneSignalSourceDir + "/public/sdks"));
  }
   else {
    // Copy to OneSignal's public/dev_sdks/OneSignalSDK.js
    gulp.src("./dist/OneSignalSDK.js")
      .pipe(gulp.dest(oneSignalSourceDir + "/public/dev_sdks"));

    // Copy to OneSignal's public/dev_sdks/OneSignalSDKWorker.js
    gulp.src("./dist/OneSignalSDK.js")
      .pipe(rename("/OneSignalSDKWorker.js"))
      .pipe(gulp.dest(oneSignalSourceDir + "/public/dev_sdks"));
  }
});

gulp.task("reload-manifest", function() {
  gulp.src('src/manifest.json')
    .pipe(gulp.dest('public'))
    .pipe(livereload());
});

