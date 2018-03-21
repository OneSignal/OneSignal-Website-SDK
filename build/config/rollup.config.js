import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import amd from 'rollup-plugin-amd';
import sourcemaps from 'rollup-plugin-sourcemaps';
import nodent from 'rollup-plugin-nodent';
import babel from 'rollup-plugin-babel';
import uglify from 'rollup-plugin-uglify';
import replace from 'rollup-plugin-replace';

const BUILD_FOLDER = "javascript-es6";
const env = process.env.ENV || "production";
const tests = process.env.TESTS;

const JS_PLUGINS = [
  replace({
    __DEV__: env === 'development',
    __TEST__: !!tests,
    __STAGING__: env === 'staging',
    __VERSION__: JSON.stringify(require('../../package.json').sdkVersion),
    __SRC_STYLESHEETS_MD5_HASH__: "x",
  }),
  resolve(),
  commonjs(),
  amd(),
  sourcemaps(),
  babel({
    exclude: 'node_modules/**',
    presets: [
      [
        "es2015",
        { "modules": false }
      ]
    ],
    plugins: [
//          "external-helpers",
      "transform-object-rest-spread",
    ],
    babelrc: false,
  }),
  nodent({
    promises: true,
    noRuntime: true
  }),
  uglify({
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
      collapse_vars: true,
      drop_console: false,
      drop_debugger: false,
      warnings: false,
      negate_iife: true
    },
    mangle: {
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
    },
    output: {
      comments: false
    }
  })
];

// rollup.config.js (building more than one bundle)
export default [
  {
    input: `build/${BUILD_FOLDER}/src/entries/worker.js`,
    output: {
      file: 'build/bundles/worker.js',
      format: 'iife',
      name: 'OneSignalWorker',
      sourceMap: true,
    },
    plugins: JS_PLUGINS,
    treeshake: {
      pureExternalModules: true,
      propertyReadSideEffects: false,
    }
  },
  {
    input: `build/${BUILD_FOLDER}/src/entries/sdk.js`,
    output: {
      file: 'build/bundles/sdk.js',
      format: 'iife',
      name: 'OneSignaldd',
      sourceMap: true,
    },
    plugins: JS_PLUGINS,
    treeshake: {
      pureExternalModules: true,
      propertyReadSideEffects: false,
    }
  }
];
