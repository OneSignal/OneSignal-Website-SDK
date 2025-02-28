#!/bin/bash

startNgrokHTTPSForwarding() {
    processesIncludeNgrok=$(ps aux | grep ngrok | wc -l)
    if [ $processesIncludeNgrok -gt 3 ]; then
        existing_url=$(cat ngrok_last_url)
        echo "ngrok is already running on at: $existing_url"
        echo -e "run 'killall ngrok' if you want a new URL or it isn't working.\n"
        retval=$existing_url
        return
    fi

    # Start ngrok
    rm ngrok.log
    ngrok http https://localhost:4001 --log=ngrok.log > /dev/null &
    echo "starting ngrok..."

    # Wait for ngrok to start
    sleep 5

    # Get the ngrok url
    read -r rawurl < <(curl localhost:4040/api/tunnels | jq -r '.tunnels | .[0] | .public_url')
    url=$(echo $rawurl | sed 's/https:\/\///')
    echo "ngrok url: $url"
    rm -f ngrok_last_url
    echo $url > ngrok_last_url
    echo ""

    retval=$url
    return
}

buildSDK() {
    local url=${1}

    # Build the SDK
    echo -e "Building SDK with build origin $url\n"
    # If you want to test with staging, change to build:dev-stag and add -a MY_API_URL
    docker-compose exec onesignal-web-sdk-dev BUILD_ORIGIN=$url NO_DEV_PORT=true npm run build:dev-prod

    echo -e "BuildSDK() Done.\n"
}

# Open the ngrok url in your default browser
openBrowserToUrl() {
    local url=${1}

    if [ -x "$(command -v open)" ]; then
        # macOS
        open $url
    else
        # Linux
        xdg-open $url
    fi
}

updateSiteUrlNoteToUserAndOpenTestSite() {
    local url=${1}

    echo -e "Open your default browser to $url"

    echo -e \
        "#############################\n" \
        "NOTE: Last Step:\n" \
        "Open your browser to" \
        "https://dashboard.onesignal.com/apps/{{ONESIGNAL_APP_ID_HERE}}/settings/webpush/configure\n" \
        "then update your site URL to https://$url/\n" \
        "#############################\n"

    openBrowserToUrl "https://$url"
}

checkIfNgrokIsInstalled() {
    # Check if ngrok is installed
    if ! [ -x "$(command -v ngrok)" ]; then
      echo 'ngrok is not installed.'
      echo 'Please install ngrok to use this script.'
      exit 1
    fi

    echo -e 'ngrok is installed. Continuing with script execution.\n'
}

checkIfNgrokIsInstalled

startNgrokHTTPSForwarding
url=$retval

buildSDK $url
updateSiteUrlNoteToUserAndOpenTestSite $url
