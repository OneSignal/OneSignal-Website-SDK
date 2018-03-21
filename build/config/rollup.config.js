const BUILD_FOLDER = "javascript-es6";

console.log(process.cwd());
// rollup.config.js (building more than one bundle)
export default [
  {
    input: `build/${BUILD_FOLDER}/src/entries/worker.js`,
    output: {
      file: 'build/bundles/worker.js',
      format: 'iife',
      name: 'OneSignalWorker'
    },
    plugins: [

    ],
    treeshake: {
      pureExternalModules: true,
      propertyReadSideEffects: false,
    }
  }
];
