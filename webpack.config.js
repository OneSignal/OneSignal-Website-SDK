var webpack = require("webpack");
var path = require('path');
var Visualizer = require('webpack-visualizer-plugin');


var IS_PROD = process.argv.indexOf('--prod') >= 0 || process.argv.indexOf('--production') >= 0;
var IS_STAGING = process.argv.indexOf('--staging') >= 0;
var IS_TEST = process.argv.indexOf('--test') >= 0;
var IS_DEV = !IS_PROD && !IS_STAGING;
var SIZE_STATS = process.argv.indexOf('--stats') >= 0 || false;

Date.prototype.timeNow = function() {
  var hours = this.getHours();
  var ampm = (hours >= 12 ? 'PM' : 'AM');
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  return ((hours < 10) ? "0" : "") + hours + ":" + ((this.getMinutes() < 10) ? "0" : "") + this.getMinutes() + ":" + ((this.getSeconds() < 10) ? "0" : "") + this.getSeconds() + " " + ampm;
};

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

/**
 * Build constants that get inserted into src/environment.js.
 */
function getBuildDefines() {
  var buildDefines = {
    __DEV__: IS_DEV,
    __TEST__: IS_TEST,
    __STAGING__: IS_STAGING,
    __VERSION__: JSON.stringify(require("./package.json").sdkVersion),
  };
  if (IS_PROD) {
    buildDefines['process.env.NODE_ENV'] = JSON.stringify('production');
  }
  return buildDefines;
}

/**
 * This plugin outputs:
 *    05:45:02 PM: File changes detected.
 * which helps identify the time files changed.
 */
var changesDetectedMessagePlugin = function() {
  this.plugin('watch-run', function(watching, callback) {
    console.log();
    console.log(new Date().timeNow() + ": File changes detected.");
    console.log();
    callback();
  })
};

function getWebSdkModuleEntry() {
  var path = './src/entry.js';
  var moduleEntry = {};
  moduleEntry[getBuildPrefix() + 'OneSignalSDK'] = path;
  return moduleEntry;
}

var webSdkPlugins = [
  new webpack.ProvidePlugin({
    'fetch': 'imports?this=>global!exports?global.fetch!whatwg-fetch'
  }),
  new webpack.optimize.DedupePlugin(),
  new webpack.optimize.OccurrenceOrderPlugin(),
  new webpack.optimize.UglifyJsPlugin({
    sourceMap: true,
    compress: {
      sequences: true,
      properties: true,
      dead_code: true,
      conditionals: true,
      comparisons: true,
      evaluate: true,
      booleans: true,
      loops: true,
      unused: true,
      hoist_funs: true,
      if_return: true,
      join_vars: true,
      cascade: true,
      collapse_vars: true,
      drop_console: false,
      drop_debugger: false,
      warnings: false,
      negate_iife: true,
    },
    mangle: IS_PROD,
    output: {
      comments: false
    }
  }),
  new webpack.DefinePlugin(getBuildDefines()),
  changesDetectedMessagePlugin
];

if (SIZE_STATS) {
  webSdkPlugins.push(new Visualizer({
    filename: './statistics.html'
  }));
}

const ONESIGNAL_WEB_SDK = {
  target: 'web',
  entry: getWebSdkModuleEntry(),
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].js'
  },
  module: {
    loaders: [{
      test: /\.js$/,
      include: [path.resolve(__dirname, "./src")],
      exclude: /(node_modules|bower_components|test\/server)/,
      loader: 'babel-loader',
      query: {
        presets: ['es2015'],
        cacheDirectory: true
      }
    },
      {
        test: /\.scss$/,
        loaders: IS_PROD ? ["style", "css", "autoprefixer-loader", "sass"] : ["style", "css", "autoprefixer-loader", "sass"]
      }]
  },
  devtool: 'source-map',
  sassLoader: {
    includePaths: [path.resolve(__dirname, "./src")]
  },
  debug: !IS_PROD,
  plugins: webSdkPlugins
};

function getWebSdkTestModuleName() {
  return getBuildPrefix() + 'OneSignalSDKTests';
}

const ONESIGNAL_WEB_SDK_TESTS = {
  target: 'web',
  entry: ['babel-polyfill', './test/entry.js'],
  output: {
    path: path.join(__dirname, 'dist'),
    filename: getWebSdkTestModuleName() + '.js'
  },
  devtool: 'source-map',
  module: {
    loaders: [{
      test: /\.js$/,
      include: [
        path.resolve(__dirname, "./src"),
        path.resolve(__dirname, "./test")
      ],
      exclude: /(node_modules|bower_components|test\/server)/,
      loader: 'babel-loader',
      query: {
        presets: ['es2015', 'stage-0'],
        plugins: ['transform-runtime'],
        cacheDirectory: true
      }
    },
      {
        test: /\.scss$/,
        loaders: IS_PROD ? ["style", "css", "autoprefixer-loader", "sass"] : ["style", "css", "autoprefixer-loader", "sass"]
      }]
  },
  sassLoader: {
    includePaths: [path.resolve(__dirname, "./src")]
  },
  debug: !IS_PROD,
  plugins: [
    new webpack.ProvidePlugin({
      'fetch': 'imports?this=>global!exports?global.fetch!whatwg-fetch'
    }),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.optimize.DedupePlugin(),
    new webpack.DefinePlugin(getBuildDefines()),
    changesDetectedMessagePlugin
  ]
};

function getWebSdkTestServerModuleName() {
  return getBuildPrefix() + 'OneSignalSDKTestServer';
}

const ONESIGNAL_WEB_SDK_TEST_SERVER = {
  target: 'node',
  entry: ['babel-polyfill', './test/server.js'],
  output: {
    path: path.join(__dirname, 'dist'),
    filename: getWebSdkTestServerModuleName() + '.js'
  },
  devtool: 'source-map',
  module: {
    loaders: [{
      test: /\.js$/,
      include: [path.resolve(__dirname, "./test/server")],
      exclude: /(node_modules|bower_components)/,
      loader: 'babel-loader',
      query: {
        presets: ['es2015', 'stage-0'],
        plugins: ['transform-runtime'],
        cacheDirectory: true
      }
    },
      {
        test: /\.json$/,
        loader: "json-loader"
      }]
  },
  debug: !IS_PROD,
  plugins: [
    new webpack.optimize.DedupePlugin(),
    new webpack.DefinePlugin(getBuildDefines()),
    changesDetectedMessagePlugin
  ]
};

var exports = [ONESIGNAL_WEB_SDK];

if (IS_TEST) {
  exports.push(ONESIGNAL_WEB_SDK_TESTS, ONESIGNAL_WEB_SDK_TEST_SERVER);
}

module.exports = exports;