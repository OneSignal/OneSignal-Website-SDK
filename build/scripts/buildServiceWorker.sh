#!/bin/bash

# Builds the local service worker files for express_webpack for use in local dev env
ORIGIN=${1}
NO_PORT=${2:-false}
HTTPS=${3:-true}

if [ "$HTTPS" = true ]; then
  PORT=4001
else
  PORT=4000
fi

if [ "$NO_PORT" = true ]; then
  SW_ORIGIN="https://${ORIGIN}"
else
  SW_ORIGIN="https://${ORIGIN}:${PORT}"
fi

echo "importScripts(\"${SW_ORIGIN}/sdks/Dev-OneSignalSDKWorker.js\");" > express_webpack/push/onesignal/OneSignalSDKWorker.js
echo "importScripts(\"${SW_ORIGIN}/sdks/Dev-OneSignalSDKWorker.js\");" > express_webpack/OneSignalSDKWorker.js
