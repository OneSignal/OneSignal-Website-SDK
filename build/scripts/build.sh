function tsc() {
  command $(yarn bin)/tsc $@
}

function rollup() {
  command $(yarn bin)/rollup $@
}

tsc --project "build/config/tsconfig.json"
