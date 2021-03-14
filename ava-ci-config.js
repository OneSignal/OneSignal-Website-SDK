// Configuration to run transpiled tests which is more performant if running all tests.
// ava is configured to use ts-node in package.json to make it easy to run one off tests
//   from a specific .ts file.
// However ts-node has to reload each time it moves on to the next .ts file making it
//   ~4x slower overall to run all tests.
export default {
  "files": [
    "build/ts-to-es6/test/unit/**/*.js"
  ],
  "source": [
    "build/ts-to-es6/src/**/*.js"
  ],
  "concurrency": 1,
  "serial": true,
  "powerAssert": true
};