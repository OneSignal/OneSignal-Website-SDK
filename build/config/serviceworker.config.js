const webpack = require('webpack');
const path = require('path');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const TerserPlugin = require('terser-webpack-plugin');

const env = process.env.ENV || "production";
const buildOrigin = process.env.BUILD_ORIGIN || "localhost";
const apiEnv = process.env.API;
const apiOrigin = process.env.API_ORIGIN || "localhost";
const isProdBuild = process.env.ENV === "production";
const nodeEnv = isProdBuild ? "production" : "development";
const isHttps = process.env.HTTPS;
const noDevPort = process.env.NO_DEV_PORT;
const tests = process.env.TESTS;
const sdkVersion = process.env.npm_package_config_sdkVersion;

function getWebpackPlugins() {
  const plugins = [
    new webpack.DefinePlugin({
      __BUILD_TYPE__: JSON.stringify(env),
      __BUILD_ORIGIN__: JSON.stringify(buildOrigin),
      __API_TYPE__: JSON.stringify(apiEnv),
      __API_ORIGIN__: JSON.stringify(apiOrigin),
      __IS_HTTPS__: isHttps === "true",
      __NO_DEV_PORT__: noDevPort === "true",
      __TEST__: !!tests,
      __VERSION__: sdkVersion,
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
    target: "web",
    entry: {
      "OneSignalSDK.sw.js": path.resolve("build/ts-to-es6/src/entries/worker.js"),
    },
    output: {
      path: path.resolve("build/bundles"),
      filename: "[name]"
    },
    mode: isProdBuild ? "production" : "development",
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
            mangle: isProdBuild ? {
              reserved: [
                "AlreadySubscribedError",
                "InvalidArgumentError",
                "InvalidStateError",
                "NotSubscribedError",
                "PermissionMessageDismissedError",
                "PushNotSupportedError",
                "PushPermissionNotGrantedError",
                "SdkInitError",
                "TimeoutError"
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
              loader: "ts-loader",
              options: {
                configFile: "build/config/tsconfig.es6.json"
              }
            },
          ]
        }
      ]
    },
    resolve: {
      extensions: [".js", ".ts"],
      modules: [
        "build/ts-to-es6",
        "build/ts-to-es6/src",
        "node_modules"
      ]
    },
    devtool: "source-map",
    plugins: getWebpackPlugins(),
  }
}

module.exports = generateWebpackConfig();
