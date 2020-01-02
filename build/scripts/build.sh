#!/bin/bash
# codepath for all commands of the form `yarn build:<env>-<env>`
ENV=$1
API=$2
HTTPS=true

if [ -z "$3" ]; then
  BUILD_ORIGIN_PROVIDED=false
else
  BUILD_ORIGIN_PROVIDED=true
  if [ $3 == "--http" ]; then
    HTTPS=false
    BUILD_ORIGIN_PROVIDED=false
  # custom origin provided. api env must be dev
  elif [ $ENV == "development" ]; then
    BUILD_ORIGIN=$3
  else
    # empty, default to production
    BUILD_ORIGIN=""
  fi
fi

if [ -z "$4" ]; then
  API_ORIGIN_PROVIDED=false
else
  API_ORIGIN_PROVIDED=true
  if [ $4 == "--http" ]; then
    HTTPS=false
    API_ORIGIN_PROVIDED=false
  # custom origin provided. api env must be dev
  elif [ $API == "development" ]; then
    API_ORIGIN=$4
  else
    # empty, default to production
    API_ORIGIN=""
  fi
fi

# both origins provided + http flag
if [[ $5 == "--http" ]]; then 
  HTTPS=false
fi

# verbose
if [ $BUILD_ORIGIN_PROVIDED = true ]; then
  echo "BUILD_ORIGIN: ${BUILD_ORIGIN}"
else
  echo "BUILD_ORIGIN: not provided"
fi

if [ $API_ORIGIN_PROVIDED = true ]; then
  echo "API_ORIGIN: ${API_ORIGIN}"
else
  echo "API_ORIGIN: not provided"
fi

if [ $HTTPS = true ]; then
  echo "PROTOCOL: https"
else
  echo "PROTOCOL: http"
fi

ENV=$ENV API=$API BUILD_ORIGIN=$BUILD_ORIGIN API_ORIGIN=$API_ORIGIN HTTPS=$HTTPS yarn transpile:sources 
ENV=$ENV API=$API BUILD_ORIGIN=$BUILD_ORIGIN API_ORIGIN=$API_ORIGIN HTTPS=$HTTPS yarn bundle-sw 
ENV=$ENV API=$API BUILD_ORIGIN=$BUILD_ORIGIN API_ORIGIN=$API_ORIGIN HTTPS=$HTTPS yarn bundle-sdk 
ENV=$ENV API=$API BUILD_ORIGIN=$BUILD_ORIGIN API_ORIGIN=$API_ORIGIN HTTPS=$HTTPS yarn bundle-page-sdk-es6
ENV=$ENV API=$API BUILD_ORIGIN=$BUILD_ORIGIN API_ORIGIN=$API_ORIGIN HTTPS=$HTTPS ./build/scripts/publish.sh