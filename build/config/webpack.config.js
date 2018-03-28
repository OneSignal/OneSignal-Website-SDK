const webpack = require('webpack');
const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

setBuildEnvironment();

function setBuildEnvironment() {
  switch (process.env.ENV) {
    case "development":
    case "staging":
    case "production":
      break;
    default:
      process.env.ENV = "development";
  }

  console.log("Build Environment:", process.env.ENV);
}

function getWebpackPlugins() {
  const plugins = [
    new webpack.optimize.ModuleConcatenationPlugin(),
    new ExtractTextPlugin('OneSignalSDKStyles.css'),
    new webpack.DefinePlugin(getBuildDefines()),
  ];
  if (!!process.env.ANALYZE) {
    const sizeAnalysisReportPath = path.resolve(path.join('build', 'size-analysis.html'));
    plugins.push(
      new BundleAnalyzerPlugin({
        // Can be `server`, `static` or `disabled`.
        // In `server` mode analyzer will start HTTP server to show bundle report.
        // In `static` mode single HTML file with bundle report will be generated.
        // In `disabled` mode you can use this plugin to just generate Webpack Stats JSON file by setting `generateStatsFile` to `true`.
        analyzerMode: 'static',
        // Path to bundle report file that will be generated in `static` mode.
        // Relative to bundles output directory.
        reportFilename: sizeAnalysisReportPath,
        // Module sizes to show in report by default.
        // Should be one of `stat`, `parsed` or `gzip`.
        // See "Definitions" section for more information.
        defaultSizes: 'gzip',
        // Automatically open report in default browser
        openAnalyzer: false,
        // If `true`, Webpack Stats JSON file will be generated in bundles output directory
        generateStatsFile: false,
        // Name of Webpack Stats JSON file that will be generated if `generateStatsFile` is `true`.
        // Relative to bundles output directory.
        statsFilename: 'stats.json',
        // Options for `stats.toJson()` method.
        // For example you can exclude sources of your modules from stats file with `source: false` option.
        // See more options here: https://github.com/webpack/webpack/blob/webpack-1/lib/Stats.js#L21
        statsOptions: null,
        // Log level. Can be 'info', 'warn', 'error' or 'silent'.
        logLevel: 'info'
      })
    );
  }
  return plugins;
}

function generateWebpackConfig() {
  return {
    target: 'web',
    entry: {
      'sdk.js': path.resolve('build/ts-to-es6/src/entries/sdk.js'),
      'worker.js': path.resolve('build/ts-to-es6/src/entries/worker.js'),
      //'stylesheet.css': path.resolve('build/ts-to-es6/src/entries/stylesheet.css'),
    },
    output: {
      path: path.resolve('build/bundles'),
      filename: '[name]'
    },
    mode: process.env.ENV === "production" ? "production" : "development",
    optimization: {
      minimizer: [
        new UglifyJsPlugin({
          uglifyOptions: {
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
              negate_iife: true
            },
            mangle: {
              enable: process.env.ENV === 'production',
              except: [
                'AlreadySubscribedError',
                'InvalidArgumentError',
                'InvalidStateError',
                'NotSubscribedError',
                'PermissionMessageDismissedError',
                'PushNotSupportedError',
                'PushPermissionNotGrantedError',
                'SdkInitError',
                'TimeoutError'
              ]
            },
            output: {
              comments: false
            }
          }
        })
      ]
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          include: ['build/ts-to-es6'],
          exclude: /(node_modules|bower_components)/,
          use: {
            loader: 'babel-loader',
            options: {
              exclude: 'node_modules/**',
              presets: [
                [
                  "es2015",
                  {
                    "modules": false
                  }
                ]
              ],
              plugins: [
                // "external-helpers",
                "transform-object-rest-spread",
              ],
              babelrc: false,
            }
          }
        },
        {
          test: /\.scss$/,
          use: ExtractTextPlugin.extract({
            use: [
              {
                loader: 'css-loader',
                options: {
                  sourceMap: true,
                  minimize: true
                }
              },
              {
                loader: 'postcss-loader',
                options: {
                  plugins: function() {
                    return [require('autoprefixer')];
                  }
                }
              },
              'sass-loader'
            ]
          })
        }
      ]
    },
    resolve: {
      extensions: ['.js', '.ts'],
      modules: [
        'build/ts-to-es6',
        'node_modules'
      ]
    },
    devtool: 'source-map',
    plugins: getWebpackPlugins()
  };
}

function getBuildDefines() {
  var buildDefines = {
    __DEV__: process.env.ENV === 'development',
    __TEST__: !!process.env.TESTS,
    __STAGING__: process.env.ENV === 'staging',
    __VERSION__: process.env.npm_package_config_sdkVersion,
    __PROCESSED_WITH_ROLLUP__: true,
    __SRC_STYLESHEETS_MD5_HASH__: "x",
  };
  if (process.env.ENV === 'production') {
    buildDefines['process.env.NODE_ENV'] = JSON.stringify('production');
  }
  return buildDefines;
}

module.exports = generateWebpackConfig();
