function tsc() {
  command $(yarn bin)/tsc $@
}

function rollup() {
  command $(yarn bin)/rollup $@
}

rm -rf build/javascript-es6/
tsc --project "build/config/tsconfig.json" &&
  rollup --config "build/config/rollup.config.js"
