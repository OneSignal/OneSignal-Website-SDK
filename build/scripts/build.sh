#!/bin/bash
# codepath for all commands of the form `yarn build:<env>-<env>`
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
    *)    # unknown option
    POSITIONAL+=("$1") # save it in an array for later
    shift # past argument
    ;;
esac
done

echo "unknown options -> ${POSITIONAL}"
set -- "${POSITIONAL[@]}" # restore positional parameters

BUILD_ORIGIN=${BUILD_ORIGIN:-"default-build-origin"}
API_ORIGIN=${API_ORIGIN:-"default-api-origin"}
ENV=${ENV:-"default-env"}
API=${API:-"default-api"}
HTTPS=${HTTPS:-true}

echo "BUILD_ORIGIN = ${BUILD_ORIGIN}"
echo "API_ORIGIN = ${API_ORIGIN}"
echo "HTTPS = ${HTTPS}"
echo "ENV = ${ENV}"
echo "API = ${API}"

ENV=$ENV API=$API BUILD_ORIGIN=$BUILD_ORIGIN API_ORIGIN=$API_ORIGIN HTTPS=$HTTPS yarn transpile:sources 
ENV=$ENV API=$API BUILD_ORIGIN=$BUILD_ORIGIN API_ORIGIN=$API_ORIGIN HTTPS=$HTTPS yarn bundle-sw 
ENV=$ENV API=$API BUILD_ORIGIN=$BUILD_ORIGIN API_ORIGIN=$API_ORIGIN HTTPS=$HTTPS yarn bundle-sdk 
ENV=$ENV API=$API BUILD_ORIGIN=$BUILD_ORIGIN API_ORIGIN=$API_ORIGIN HTTPS=$HTTPS yarn bundle-page-sdk-es6
ENV=$ENV API=$API BUILD_ORIGIN=$BUILD_ORIGIN API_ORIGIN=$API_ORIGIN HTTPS=$HTTPS ./build/scripts/publish.sh
