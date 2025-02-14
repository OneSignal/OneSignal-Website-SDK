const webpack = require('webpack');
const path = require('path');
const BundleAnalyzerPlugin =
  require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const dir = require('node-dir');
const md5file = require('md5-file');
const crypto = require('crypto');
const TerserPlugin = require('terser-webpack-plugin');

const env = process.env.ENV || 'production';
const buildOrigin = process.env.BUILD_ORIGIN || 'localhost';
const apiEnv = process.env.API;
const apiOrigin = process.env.API_ORIGIN || 'localhost';
const isProdBuild = process.env.ENV === 'production';
const nodeEnv = isProdBuild ? 'production' : 'development';
const isHttps = process.env.HTTPS;
const noDevPort = process.env.NO_DEV_PORT;
const tests = process.env.TESTS;
const sdkVersion = process.env.npm_package_config_sdkVersion;

async function getStylesheetsHash() {
  const styleSheetsPath = 'src/page/stylesheets';

  return await new Promise((resolve, reject) => {
    dir.files(styleSheetsPath, async (err, files) => {
      if (err) throw err;
      const filteredFiles = files.filter((filePath) => {
        console.info('CSS Stylesheet:', filePath);
        const fileName = path.basename(filePath);
        if (fileName.endsWith('.scss')) {
          // Only hash SCSS source files
          return true;
        }
      });
      if (filteredFiles.length === 0) {
        reject(
          `No .scss files were found in ${styleSheetsPath}, but SCSS files were expected. SCSS stylesheets in this directory are MD5 hashed and added as a build-time variable so loading the stylesheet from the global CDN always loads the correct version.`,
        );
      }
      let hashes = [];
      for (let styleSheetPath of filteredFiles) {
        const hash = md5file.sync(styleSheetPath);
        hashes.push(hash);
      }
      // Strangely enough, the order is inconsistent so we have to sort the hashes
      hashes = hashes.sort();
      const joinedHashesStr = hashes.join('-');
      const combinedHash = crypto
        .createHash('md5')
        .update(joinedHashesStr)
        .digest('hex');
      console.info(
        `MD5 hash of SCSS source files in ${styleSheetsPath} is ${combinedHash}.`,
      );
      resolve(combinedHash);
    });
  });
}

async function getWebpackPlugins() {
  const plugins = [
    new webpack.DefinePlugin({
      __BUILD_TYPE__: JSON.stringify(env),
      __BUILD_ORIGIN__: JSON.stringify(buildOrigin),
      __API_TYPE__: JSON.stringify(apiEnv),
      __API_ORIGIN__: JSON.stringify(apiOrigin),
      __IS_HTTPS__: isHttps === 'true',
      __NO_DEV_PORT__: noDevPort === 'true',
      __TEST__: !!tests,
      __VERSION__: sdkVersion,
      __LOGGING__: env === 'development',
      __SRC_STYLESHEETS_MD5_HASH__: JSON.stringify(await getStylesheetsHash()),
      'process.env.NODE_ENV': JSON.stringify(nodeEnv),
    }),
  ];
  if (!!process.env.ANALYZE) {
    const sizeAnalysisReportPath = path.resolve(
      path.join('build', 'size-analysis.html'),
    );
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
        logLevel: 'info',
      }),
    );
  }
  return plugins;
}

async function generateWebpackConfig() {
  return {
    target: 'web',
    entry: {
      'OneSignalSDK.page.js': path.resolve(
        'build/ts-to-es6/src/entries/sdk.js',
      ),
    },
    output: {
      path: path.resolve('build/bundles'),
      filename: '[name]',
    },
    mode: process.env.ENV === 'production' ? 'production' : 'development',
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
            mangle:
              process.env.ENV === 'production'
                ? {
                    reserved: [
                      'AlreadySubscribedError',
                      'InvalidArgumentError',
                      'InvalidStateError',
                      'NotSubscribedError',
                      'PermissionMessageDismissedError',
                      'PushNotSupportedError',
                      'PushPermissionNotGrantedError',
                      'SdkInitError',
                      'TimeoutError',
                    ],
                  }
                : false,
            output: {
              comments: false,
            },
          },
        }),
      ],
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
                configFile: 'build/config/tsconfig.es5.json',
              },
            },
          ],
        },
      ],
    },
    resolve: {
      extensions: ['.js', '.ts'],
      modules: ['build/ts-to-es6', 'build/ts-to-es6/src', 'node_modules'],
    },
    devtool: 'source-map',
    plugins: await getWebpackPlugins(),
  };
}

module.exports = generateWebpackConfig();
