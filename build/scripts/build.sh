#!/bin/bash
# codepath for all commands of the form `npm run build:<env>-<env>`
# defaults
POSITIONAL=()
while [[ $# -gt 0 ]]
do
key="$1"

case $key in
    -b|--build)
    BUILD_ORIGIN="$2"
    shift # past argument
    shift # past value
    ;;
    -a|--api)
    API_ORIGIN="$2"
    shift # past argument
    shift # past value
    ;;
    -f|--from)
    ENV="$2"
    shift # past argument
    shift # past value
    ;;
    -t|--target)
    API="$2"
    shift # past argument
    shift # past value
    ;;
    --http)
    HTTPS=false
    shift # past argument
    ;;
    --no-port)
    NO_DEV_PORT=true
    shift # past argument
    ;;
    *)    # unknown option
    POSITIONAL+=("$1") # save it in an array for later
    shift # past argument
    ;;
esac
done

BUILD_ORIGIN=${BUILD_ORIGIN:-"localhost"}
API_ORIGIN=${API_ORIGIN:-"onesignal.com"}
ENV=${ENV:-"development"}
API=${API:-"production"}
HTTPS=${HTTPS:-true}
NO_DEV_PORT=${NO_DEV_PORT:-false}


if [ "$ENV" = "staging" ]; then
    API="staging"
    API_ORIGIN=$STAGING_DOMAIN
    BUILD_ORIGIN=$STAGING_DOMAIN
fi

echo "BUILD_ORIGIN = ${BUILD_ORIGIN}"
echo "API_ORIGIN = ${API_ORIGIN}"
echo "HTTPS = ${HTTPS}"
echo "ENV = ${ENV}"
echo "API = ${API}"
echo "NO_DEV_PORT = ${NO_DEV_PORT}"
echo "Unknown options -> ${POSITIONAL}"
set -- "${POSITIONAL[@]}" # restore positional parameters

# build local SW file for dev env
if [ "$NO_DEV_PORT" = false ]; then
  if [ "$HTTPS" = true ]; then
      PORT=":4001"
  else
      PORT=":4000"
  fi
else
  PORT=""
fi

./build/scripts/buildServiceWorker.sh $BUILD_ORIGIN $PORT

ENV=$ENV API=$API BUILD_ORIGIN=$BUILD_ORIGIN API_ORIGIN=$API_ORIGIN HTTPS=$HTTPS NO_DEV_PORT=$NO_DEV_PORT npm run transpile:sources
ENV=$ENV API=$API BUILD_ORIGIN=$BUILD_ORIGIN API_ORIGIN=$API_ORIGIN HTTPS=$HTTPS NO_DEV_PORT=$NO_DEV_PORT npm run bundle-sw
ENV=$ENV API=$API BUILD_ORIGIN=$BUILD_ORIGIN API_ORIGIN=$API_ORIGIN HTTPS=$HTTPS NO_DEV_PORT=$NO_DEV_PORT npm run bundle-sdk
ENV=$ENV API=$API BUILD_ORIGIN=$BUILD_ORIGIN API_ORIGIN=$API_ORIGIN HTTPS=$HTTPS NO_DEV_PORT=$NO_DEV_PORT npm run bundle-page-sdk-es6
ENV=$ENV API=$API BUILD_ORIGIN=$BUILD_ORIGIN API_ORIGIN=$API_ORIGIN HTTPS=$HTTPS NO_DEV_PORT=$NO_DEV_PORT ./build/scripts/publish.sh
