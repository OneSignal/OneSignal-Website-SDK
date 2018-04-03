ONESIGNAL_PUBLIC_PATH=$npm_package_config_onesignalPublicPath
ONESIGNAL_PUBLIC_SDKS_PATH=$npm_package_config_onesignalPublicSdksPath

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

# Copy: ./sdk.js  ==>  OneSignal/public/sdks/OneSignalSDK.js
cp build/bundles/sdk.js $ONESIGNAL_PUBLIC_SDKS_PATH/$PREFIX"OneSignalSDK.js"

# Copy: ./worker.js  ==>  OneSignal/public/sdks/OneSignalSDKWorker.js
#                         OneSignal/public/OneSignalSDKWorker.js
cp build/bundles/worker.js $ONESIGNAL_PUBLIC_SDKS_PATH/$PREFIX"OneSignalSDKWorker.js"
cp build/bundles/worker.js $ONESIGNAL_PUBLIC_PATH/$PREFIX"OneSignalSDKWorker.js"

# Copy: ./worker.js  ==>  (none in SDKs folder)
#                         OneSignal/public/OneSignalSDKUpdaterWorker.js
cp build/bundles/worker.js $ONESIGNAL_PUBLIC_PATH/$PREFIX"OneSignalSDKUpdaterWorker.js"

# Copy: ./sdk.js.map  ==>  OneSignal/public/sdks/OneSignalSDK.js.map
cp build/bundles/sdk.js.map $ONESIGNAL_PUBLIC_SDKS_PATH/$PREFIX"OneSignalSDK.js.map"

# Copy: ./worker.js.map  ==>  OneSignal/public/sdks/OneSignalSDKWorker.js.map
#                             OneSignal/public/OneSignalSDKWorker.js.map
cp build/bundles/worker.js.map $ONESIGNAL_PUBLIC_SDKS_PATH/$PREFIX"OneSignalSDKWorker.js.map"
cp build/bundles/worker.js.map $ONESIGNAL_PUBLIC_PATH/$PREFIX"OneSignalSDKWorker.js.map"

# Copy: ./worker.js.map  ==>  (none in SDKs folder)
#                             OneSignal/public/OneSignalSDKUpdaterWorker.js.map
cp build/bundles/worker.js.map $ONESIGNAL_PUBLIC_PATH/$PREFIX"OneSignalSDKUpdaterWorker.js.map"

# Copy: ./stylesheet.css  ==>  OneSignal/public/sdks/OneSignalSDKStyles.css
# Copy: ./stylesheet.css.map  ==>  OneSignal/public/sdks/OneSignalSDKStyles.css.map
cp build/bundles/stylesheet.css $ONESIGNAL_PUBLIC_SDKS_PATH/$PREFIX"OneSignalSDKStyles.css"
cp build/bundles/stylesheet.css.map $ONESIGNAL_PUBLIC_SDKS_PATH/$PREFIX"OneSignalSDKStyles.css.map"

