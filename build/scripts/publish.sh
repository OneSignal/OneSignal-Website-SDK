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

# Copy: ./OneSignalSDKsdk.js  ==>  OneSignal/public/sdks/OneSignalSDK.js
cp build/bundles/OneSignalSDK.js $ONESIGNAL_PUBLIC_SDKS_PATH/$PREFIX"OneSignalSDK.js"

# Copy: ./OneSignalSDKWorker.js  ==>  OneSignal/public/sdks/OneSignalSDKWorker.js
#                         OneSignal/public/OneSignalSDKWorker.js
cp build/bundles/OneSignalSDKWorker.js $ONESIGNAL_PUBLIC_SDKS_PATH/$PREFIX"OneSignalSDKWorker.js"
cp build/bundles/OneSignalSDKWorker.js $ONESIGNAL_PUBLIC_PATH/$PREFIX"OneSignalSDKWorker.js"

# Copy: ./OneSignalSDKWorker.js  ==>  (none in SDKs folder)
#                         OneSignal/public/OneSignalSDKUpdaterWorker.js
cp build/bundles/OneSignalSDKWorker.js $ONESIGNAL_PUBLIC_PATH/$PREFIX"OneSignalSDKUpdaterWorker.js"

# Copy: ./OneSignalSDK.js.map  ==>  OneSignal/public/sdks/OneSignalSDK.js.map
cp build/bundles/OneSignalSDK.js.map $ONESIGNAL_PUBLIC_SDKS_PATH/$PREFIX"OneSignalSDK.js.map"

# Copy: ./OneSignalSDKWorker.js.map  ==>  OneSignal/public/sdks/OneSignalSDKWorker.js.map
#                             OneSignal/public/OneSignalSDKWorker.js.map
cp build/bundles/OneSignalSDKWorker.js.map $ONESIGNAL_PUBLIC_SDKS_PATH/$PREFIX"OneSignalSDKWorker.js.map"
cp build/bundles/OneSignalSDKWorker.js.map $ONESIGNAL_PUBLIC_PATH/$PREFIX"OneSignalSDKWorker.js.map"

# Copy: ./OneSignalSDKWorker.js.map  ==>  (none in SDKs folder)
#                             OneSignal/public/OneSignalSDKUpdaterWorker.js.map
cp build/bundles/OneSignalSDKWorker.js.map $ONESIGNAL_PUBLIC_PATH/$PREFIX"OneSignalSDKUpdaterWorker.js.map"

# Copy: ./OneSignalSDKStyles.css  ==>  OneSignal/public/sdks/OneSignalSDKStyles.css
# Copy: ./OneSignalSDKStyles.css.map  ==>  OneSignal/public/sdks/OneSignalSDKStyles.css.map
cp build/bundles/OneSignalSDKStyles.css $ONESIGNAL_PUBLIC_SDKS_PATH/$PREFIX"OneSignalSDKStyles.css"
cp build/bundles/OneSignalSDKStyles.css.map $ONESIGNAL_PUBLIC_SDKS_PATH/$PREFIX"OneSignalSDKStyles.css.map"

