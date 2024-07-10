const webpack = require('webpack');
const path = require('path');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const md5file = require('md5-file');
const crypto = require('crypto');
const glob = require('glob');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

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

async function getWebpackPlugins() {
  const plugins = [
    new webpack.optimize.ModuleConcatenationPlugin(),
    new MiniCssExtractPlugin({ filename: 'OneSignalSDKStyles.[contenthash].css' }),
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

async function generateWebpackConfig() {
  return {
    target: 'web',
    entry: {
      'OneSignalSDK.js': path.resolve('build/ts-to-es6/src/entries/sdk.js'),
      'OneSignalSDKWorker.js': path.resolve('build/ts-to-es6/src/entries/worker.js'),
      'OneSignalSDKStyles.css': path.resolve('src/entries/stylesheet.js'),
    },
    output: {
      path: path.resolve('build/bundles'),
      filename: '[name]'
    },
    mode: process.env.ENV === "production" ? "production" : "development",
    optimization: {
       minimizer: [
        new TerserPlugin({
          terserOptions: {
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
        }),
        ...(process.env.ENV === 'production' ? [new CssMinimizerPlugin()] : []),
      ]
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                configFile: "build/config/tsconfig.es5.json"
              }
            }
          ]
        },
        {
          test: /\.scss$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                sourceMap: true,
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  plugins: [
                    require('autoprefixer'),
                  ],
                },
              },
            },
            'sass-loader',
          ],
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
    plugins: await getWebpackPlugins()
  };
}

function getStylesheetsHash() {
  const styleSheetsPath = 'src/stylesheets';
  const files = glob.sync(`${styleSheetsPath}/**/*.scss`);

  if (files.length === 0) {
    throw new Error(`No .scss files were found in ${styleSheetsPath}, but SCSS files were expected.`);
  }

  let hashes = [];
  for (let styleSheetPath of files) {
    const hash = md5file.sync(styleSheetPath);
    hashes.push(hash);
  }

  // Strangely enough, the order is inconsistent so we have to sort the hashes
  hashes = hashes.sort();
  const joinedHashesStr = hashes.join('-');
  const combinedHash = crypto.createHash('md5').update(joinedHashesStr).digest("hex");

  console.log(`MD5 hash of SCSS source files in ${styleSheetsPath} is ${combinedHash}.`);

  return combinedHash;
}


function getBuildDefines() {
  var buildDefines = {
    __BUILD_TYPE__: process.env.ENV,
    __BUILD_ORIGIN__: process.env.BUILD_ORIGIN,
    __API_TYPE__: process.env.API,
    __API_ORIGIN__: process.env.API_ORIGIN,
    __IS_HTTPS__: process.env.HTTPS,
    __NO_DEV_PORT__: process.env.NO_DEV_PORT,
    __TEST__: !!process.env.TESTS,
    __VERSION__: process.env.npm_package_config_sdkVersion,
    __LOGGING__: process.env.ENV === "development",
    __SRC_STYLESHEETS_MD5_HASH__: JSON.stringify(getStylesheetsHash()),
  };
  if (process.env.ENV === 'production') {
    buildDefines['process.env.NODE_ENV'] = JSON.stringify('production');
  }
  return buildDefines;
}

module.exports = () => generateWebpackConfig();
