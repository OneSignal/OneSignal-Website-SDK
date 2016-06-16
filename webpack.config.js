var webpack = require("webpack");
var path = require('path');
var babelPolyfill = require('babel-polyfill');
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var IS_PROD = process.argv.indexOf('--production') >= 0;
var IS_TEST = process.argv.indexOf('--test') >= 0;
var IS_BETA = process.argv.indexOf('--beta') >= 0;

Date.prototype.timeNow = function() {
  var hours = this.getHours();
  var ampm = (hours >= 12 ? 'PM' : 'AM');
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  return ((hours < 10) ? "0" : "") + hours + ":" + ((this.getMinutes() < 10) ? "0" : "") + this.getMinutes() + ":" + ((this.getSeconds() < 10) ? "0" : "") + this.getSeconds() + " " + ampm;
};

var definePluginConstants = {
  __DEV__: !IS_PROD,
  __BETA__: IS_BETA,
  __TEST__: IS_TEST,
  __VERSION__: JSON.stringify(require("./package.json").sdkVersion),
};

if (IS_PROD) {
  definePluginConstants['process.env.NODE_ENV'] = JSON.stringify('production');
}

var recompileFunction = function() {
  this.plugin('watch-run', function(watching, callback) {
    console.log();
    console.log('Recompiling assets starting ' + new Date()
            .timeNow() + "...");
    callback();
  })
};

var entries = { };
if (IS_BETA)
  entries['OneSignalSDKBeta'] = './src/entry.js';
else
  entries['OneSignalSDK'] = './src/entry.js';

const ONESIGNAL_WEB_SDK = {
  name: 'OneSignalSDK',
  target: 'web',
  entry: entries,
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].js'
  },
  devtool: 'source-map',
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
  sassLoader: {
    includePaths: [path.resolve(__dirname, "./src")]
  },
  debug: !IS_PROD,
  plugins: [
    new webpack.ProvidePlugin({
      'fetch': 'imports?this=>global!exports?global.fetch!whatwg-fetch'
    }),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.optimize.UglifyJsPlugin({
      sourceMap: true,
      compress: {
        sequences: false,
        dead_code: false,
        conditionals: false,
        booleans: false,
        unused: false,
        if_return: false,
        join_vars: false,
        drop_console: false,
        drop_debugger: false,
        warnings: false,
      },
      mangle: IS_PROD,
      output: {
        comments: false
      }
    }),
    new webpack.DefinePlugin(definePluginConstants),
    recompileFunction
  ]
};

const ONESIGNAL_WEB_SDK_TESTS = {
  name: 'OneSignalSDKTests',
  target: 'web',
  entry: ['babel-polyfill', './test/entry.js'],
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'OneSignalSDKTests.js'
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
    new webpack.DefinePlugin(definePluginConstants),
    recompileFunction
  ]
};

const ONESIGNAL_WEB_SDK_TEST_SERVER = {
  name: 'OneSignalSDKTestServer',
  target: 'node',
  entry: ['babel-polyfill', './test/server.js'],
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'OneSignalSDKTestServer.js'
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
    new webpack.DefinePlugin(definePluginConstants),
    recompileFunction
  ]
};

var exports = [ONESIGNAL_WEB_SDK];

if (IS_TEST) {
  exports.push(ONESIGNAL_WEB_SDK_TESTS, ONESIGNAL_WEB_SDK_TEST_SERVER);
}

module.exports = exports;