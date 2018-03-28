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

function getWebpackPlugins(config) {
  const plugins = [
    new webpack.optimize.ModuleConcatenationPlugin(),
    new ExtractTextPlugin(config.get('build:stylesheetsBundleName')),
    new webpack.DefinePlugin(await BundlerModule.getBuildDefines(config)),
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
        negate_iife: true
      },
      mangle: {
        enable: config.get('env') === 'production',
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
    })
  ];
  if (config.get('analyze')) {
    const sizeAnalysisReportPath =
      config.get('build:sizeAnalysisFilePath') ||
      path.resolve(path.join(config.get('build:tempDirectory'), 'size-analysis.html'));
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

function generateWebpackConfig(config, plugins) {
  return {
    target: 'web',
    entry: {
      'sdk.js': 'build/ts-to-es6/entries/sdk.js',
      'worker.js': 'build/ts-to-es6/entries/worker.js',
      'stylesheet.css': 'build/ts-to-es6/entries/stylesheet.css',
    },
    output: {
      path: 'build/bundles',
      filename: '[name]'
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          include: ['build/ts-to-es6'],
          exclude: /(node_modules|bower_components)/,
          use: 'val-loader'
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
    plugins: plugins
  };
}

function getBuildDefines(config) {
  const env = config.get('env');
  var buildDefines = {
    __DEV__: process.env.ENV === 'development',
    __TEST__: !!process.env.TESTS,
    __STAGING__: process.env.ENV === 'staging',
    __VERSION__: process.env.npm_package_config_sdkVersion,
    __PROCESSED_WITH_ROLLUP__: true,
    __SRC_STYLESHEETS_MD5_HASH__: "x",
  };
  if (env === 'production') {
    buildDefines['process.env.NODE_ENV'] = JSON.stringify('production');
  }
  return buildDefines;
}

module.exports = generateWebpackConfig();
