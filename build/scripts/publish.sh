ONESIGNAL_PUBLIC_PATH=$npm_package_config_onesignalPublicPath
ONESIGNAL_PUBLIC_SDKS_PATH=$npm_package_config_onesignalPublicSdksPath

# Copy: ./sdk.js  ==>  OneSignal/public/sdks/OneSignalSDK.js
cp build/bundles/sdk.js $ONESIGNAL_PUBLIC_SDKS_PATH/"OneSignalSDK.js"

# Copy: ./worker.js  ==>  OneSignal/public/sdks/OneSignalSDKWorker.js
#                         OneSignal/public/OneSignalSDKWorker.js
cp build/bundles/worker.js $ONESIGNAL_PUBLIC_SDKS_PATH/"OneSignalSDKWorker.js"
cp build/bundles/worker.js $ONESIGNAL_PUBLIC_PATH/"OneSignalSDKWorker.js"

# Copy: ./worker.js  ==>  (none in SDKs folder)
#                         OneSignal/public/OneSignalSDKUpdaterWorker.js
cp build/bundles/worker.js $ONESIGNAL_PUBLIC_PATH/"OneSignalSDKUpdaterWorker.js"

# Copy: ./sdk.js.map  ==>  OneSignal/public/sdks/OneSignalSDK.js.map
cp build/bundles/sdk.js.map $ONESIGNAL_PUBLIC_SDKS_PATH/"OneSignalSDK.js.map"

# Copy: ./worker.js.map  ==>  OneSignal/public/sdks/OneSignalSDKWorker.js.map
#                             OneSignal/public/OneSignalSDKWorker.js.map
cp build/bundles/worker.js.map $ONESIGNAL_PUBLIC_SDKS_PATH/"OneSignalSDKWorker.js.map"
cp build/bundles/worker.js.map $ONESIGNAL_PUBLIC_PATH/"OneSignalSDKWorker.js.map"

# Copy: ./worker.js.map  ==>  (none in SDKs folder)
#*                            OneSignal/public/OneSignalSDKUpdaterWorker.js.map
cp build/bundles/worker.js.map $ONESIGNAL_PUBLIC_PATH/"OneSignalSDKUpdaterWorker.js.map"

# Copy: ./styles.css  ==>  OneSignal/public/sdks/OneSignalSDKStyles.css
# Copy: ./styles.css.map  ==>  OneSignal/public/sdks/OneSignalSDKStyles.css.map
cp build/bundles/styles.css $ONESIGNAL_PUBLIC_SDKS_PATH/"OneSignalSDKStyles.css"
cp build/bundles/styles.css.map $ONESIGNAL_PUBLIC_SDKS_PATH/"OneSignalSDKStyles.css.map"

