#!/usr/bin/env bash

getPrefix() {
  if [ "$ENV" = "production" ]; then
    echo ""
  elif [ "$ENV" = "staging" ]; then
    echo "Staging-"
  else
    echo "Dev-"
  fi
}

PREFIX=$(getPrefix)
set -x

pwd

rm -rf build/releases
mkdir -p build/releases

# Copy files with the prefix
cp build/bundles/OneSignalSDK.page.js build/releases/$PREFIX"OneSignalSDK.page.js"
cp build/bundles/OneSignalSDK.page.js.map build/releases/$PREFIX"OneSignalSDK.page.js.map"

cp build/bundles/OneSignalSDK.page.es6.js build/releases/$PREFIX"OneSignalSDK.page.es6.js"
cp build/bundles/OneSignalSDK.page.es6.js.map build/releases/$PREFIX"OneSignalSDK.page.es6.js.map"

cp build/bundles/OneSignalSDK.sw.js build/releases/$PREFIX"OneSignalSDK.sw.js"
cp build/bundles/OneSignalSDK.sw.js.map build/releases/$PREFIX"OneSignalSDK.sw.js.map"

cp build/bundles/OneSignalSDK.page.styles.css build/releases/$PREFIX"OneSignalSDK.page.styles.css"
cp build/bundles/OneSignalSDK.page.styles.css.map build/releases/$PREFIX"OneSignalSDK.page.styles.css.map"

# Update sourceMappingURL to include the prefix
for file in build/releases/$PREFIX*.js build/releases/$PREFIX*.css; do
  # Ensure we're only updating files with a sourceMappingURL
  if grep -q "sourceMappingURL=" "$file"; then
    sed -i "s|sourceMappingURL=OneSignal|sourceMappingURL=${PREFIX}OneSignal|g" "$file"
  fi
done
