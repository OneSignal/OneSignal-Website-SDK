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
cp build/bundles/OneSignalPageSDKES6.js build/releases/$PREFIX"OneSignalPageSDKES6.js"
cp build/bundles/OneSignalPageSDKES6.js.map build/releases/$PREFIX"OneSignalPageSDKES6.js.map"

cp build/bundles/OneSignalSDKWorker.js build/releases/$PREFIX"OneSignalSDKWorker.js"
cp build/bundles/OneSignalSDKWorker.js.map build/releases/$PREFIX"OneSignalSDKWorker.js.map"

cp build/bundles/OneSignalSDKStyles.css build/releases/$PREFIX"OneSignalSDKStyles.css"
cp build/bundles/OneSignalSDKStyles.css.map build/releases/$PREFIX"OneSignalSDKStyles.css.map"

if [ "$ENV" = "staging" ]; then
  sed -i 's/sourceMappingURL=OneSignal/sourceMappingURL=Staging-OneSignal/' build/releases/Staging-*.js
  sed -i 's/sourceMappingURL=OneSignal/sourceMappingURL=Staging-OneSignal/' build/releases/Staging-*.css
fi
