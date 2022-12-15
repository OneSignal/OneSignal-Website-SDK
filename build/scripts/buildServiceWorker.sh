#!/bin/bash

# Builds the local service worker files for express_webpack for use in local dev env
echo "Building local service worker file with arguments: ${1} ${2}"
echo "importScripts(\"https://${1}${2}/sdks/Dev-OneSignalSDK.sw.js\");" > express_webpack/push/onesignal/OneSignalSDK.sw.js
echo "importScripts(\"https://${1}${2}/sdks/Dev-OneSignalSDK.sw.js\");" > express_webpack/OneSignalSDK.sw.js
