var webpack = require("webpack");
var path = require('path');
var babelPolyfill = require('babel-polyfill');
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var IS_PROD = process.argv.indexOf('--production-build') >= 0;
Date.prototype.timeNow = function() {
  var hours = this.getHours();
  var ampm = (hours >= 12 ? 'PM' : 'AM');
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  return ((hours < 10) ? "0" : "") + hours + ":" + ((this.getMinutes() < 10) ? "0" : "") + this.getMinutes() + ":" + ((this.getSeconds() < 10) ? "0" : "") + this.getSeconds() + " " + ampm;
};
module.exports = {
  entry: {
    OneSignalSDK: './src/entry.js',
    test: './test/entry.js'
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].js'
  },
  devtool: 'source-map',
  module: {
    loaders: [{
      test: /\.js$/,
      include: [path.resolve(__dirname, "./src"), path.resolve(__dirname, "./test")],
      exclude: /(node_modules|bower_components)/,
      loader: 'babel-loader',
      query: {
        presets: ['es2015'],
        cacheDirectory: true
      }
    },
    {
      test: /\.scss$/,
      loaders: IS_PROD ? ["style", "css", "sass"] : ["style", "css?sourceMap", "sass?sourceMap"]
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
    new webpack.optimize.AggressiveMergingPlugin(),
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
        drop_console: false
      },
      mangle: false,
      output: {
        comments: false
      }
    }),
    function() {
      this.plugin('watch-run', function(watching, callback) {
        console.log();
        console.log('Recompiling assets starting ' + new Date()
            .timeNow() + "...");
        callback();
      })
    }
  ].concat(IS_PROD ?
      [
        new webpack.DefinePlugin({
          'process.env': {
            'NODE_ENV': JSON.stringify('production'),
          },
          __DEV__: false,
          __VERSION__: JSON.stringify(require("./package.json").version)
        }),
      ] :
      [
        new webpack.DefinePlugin({
          __DEV__: true,
          __VERSION__: JSON.stringify(require("./package.json").version)
        })
      ])
};