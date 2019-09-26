const webpack = require('webpack');
const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const { CheckerPlugin } = require('awesome-typescript-loader');

const env = process.env.ENV || "production";
const isProdBuild = process.env.ENV === "production";
const nodeEnv = isProdBuild ? "production" : "development";

async function getWebpackPlugins() {
  const plugins = [
    new CheckerPlugin(),
      new webpack.optimize.ModuleConcatenationPlugin(),
      new ExtractTextPlugin("OneSignalSDKStyles.css"),
      new webpack.DefinePlugin({
        __DEV__: env === "development",
        __TEST__: !!process.env.TESTS,
        __STAGING__: env === "staging",
        __VERSION__: process.env.npm_package_config_sdkVersion,
        __LOGGING__: env === "development",
        "process.env.NODE_ENV": JSON.stringify(nodeEnv),
      })
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

async function generateWebpackConfig() {
  return {
    target: 'web',
    entry: {
      'OneSignalPageSDKES6.js': path.resolve('build/ts-to-es6/src/entries/pageSdkInit.js'),
    },
    output: {
      path: path.resolve('build/bundles'),
      filename: '[name]'
    },
    mode: process.env.ENV === "production" ? "production" : "development",
    optimization: {
      minimizer: [
        new UglifyJsPlugin({
          sourceMap: true,
          uglifyOptions: {
            sourceMap: true,
            compress: {
              drop_console: false,
              drop_debugger: false,
              warnings: false,
            },
            mangle: process.env.ENV === 'production' ? {
              reserved: [
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
            } : false,
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
          exclude: /node_modules/,
          use: [
            {
              loader: 'awesome-typescript-loader',
              options: {
                configFileName: "build/config/tsconfig.es6.json"
              }
            },
          ]
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
        'build/ts-to-es6/src',
        'node_modules'
      ]
    },
    devtool: 'source-map',
    plugins: await getWebpackPlugins(),
  }
}

module.exports = generateWebpackConfig();
