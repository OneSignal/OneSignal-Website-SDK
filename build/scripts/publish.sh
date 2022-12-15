#!/usr/bin/env bash
getPrefix() {
  if [ "$ENV" = "production" ]; then
    echo ""
  elif [ "$ENV" = "staging" ]; then
    echo "Staging-"
  else [ "$ENV" = "development" ]
    echo "Dev-"
  fi
}

PREFIX=$(getPrefix)
set -x

pwd

mkdir build/releases

cp build/bundles/OneSignalSDK.page.js build/releases/$PREFIX"OneSignalSDK.page.js"
cp build/bundles/OneSignalSDK.page.js.map build/releases/$PREFIX"OneSignalSDK.page.js.map"
cp build/bundles/OneSignalSDK.page.es6.js build/releases/$PREFIX"OneSignalSDK.page.es6.js"
cp build/bundles/OneSignalSDK.page.es6.js.map build/releases/$PREFIX"OneSignalSDK.page.es6.js.map"

cp build/bundles/OneSignalSDKWorker.js build/releases/$PREFIX"OneSignalSDKWorker.js"
cp build/bundles/OneSignalSDKWorker.js.map build/releases/$PREFIX"OneSignalSDKWorker.js.map"

cp build/bundles/OneSignalSDK.page.styles.css build/releases/$PREFIX"OneSignalSDK.page.styles.css"
cp build/bundles/OneSignalSDK.page.styles.css.map build/releases/$PREFIX"OneSignalSDK.page.styles.css.map"

if [ "$ENV" = "staging" ]; then
  sed -i 's/sourceMappingURL=OneSignal/sourceMappingURL=Staging-OneSignal/' build/releases/Staging-*.js
  sed -i 's/sourceMappingURL=OneSignal/sourceMappingURL=Staging-OneSignal/' build/releases/Staging-*.css
fi
