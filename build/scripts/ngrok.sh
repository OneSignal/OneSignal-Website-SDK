#!/bin/bash

# Check if ngrok is installed
if ! [ -x "$(command -v ngrok)" ]; then
  echo 'ngrok is not installed.'
  echo 'Please install ngrok to use this script.'
  exit 1
fi

echo 'ngrok is installed. Continuing with script execution.'

# Kill any existing ngrok processes
killall ngrok

# Start ngrok
ngrok http https://localhost:4001 --log=ngrok.log > /dev/null &
echo "starting ngrok..."

# Wait for ngrok to start
sleep 5

# Get the ngrok url
read -r rawurl < <(grep -o "https://[^ ]*\.ngrok\.io" ngrok.log)
url=$(echo $rawurl | sed 's/https:\/\///')
echo "ngrok url: $url"

rm ngrok.log

# Build the service worker file
echo "building service worker file"
./build/scripts/buildServiceWorker.sh $url

# Build the SDK
echo "building SDK with build origin $url"
docker-compose exec onesignal-web-sdk-dev yarn build:dev-prod -b $url --no-port
echo "Done."

echo "Last step: update the SDK script src to https://$url/sdks/Dev-OneSignalSDK.js"

# Open the ngrok url in your default browser
if [ -x "$(command -v open)" ]; then
    # macOS
    open "https://$url"
else
    # Linux
    xdg-open "https://$url"
fi
