#!/bin/bash

# Builds the local service worker file for express_webpack for use in local dev env
echo "importScripts(\"https://${1}${2}/sdks/Dev-OneSignalSDKWorker.js\");" > express_webpack/push/onesignal/OneSignalSDKWorker.js
