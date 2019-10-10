#!/bin/bash
# codepath for all commands of the form `yarn build:<env>-<env>`
ENV=$1
API=$2

if [ -z "$3" ]; then
  # no origin provided
  echo "No build origin provided";
else
  # custom origin provided. api env must be dev
  if [ $ENV == "development" ]; then
    BUILD_ORIGIN=$3
  else
    # empty, default to production
    BUILD_ORIGIN=""
  fi
fi

if [ -z "$4" ]; then
  # no origin provided
  echo "No API origin provided";
else
  # custom origin provided. api env must be dev
  if [ $API == "development" ]; then
    API_ORIGIN=$4
  else
    # empty, default to production
    API_ORIGIN=""
  fi
fi

ENV=$ENV API=$API BUILD_ORIGIN=$BUILD_ORIGIN API_ORIGIN=$API_ORIGIN yarn transpile:sources 
ENV=$ENV API=$API BUILD_ORIGIN=$BUILD_ORIGIN API_ORIGIN=$API_ORIGIN yarn bundle-sw 
ENV=$ENV API=$API BUILD_ORIGIN=$BUILD_ORIGIN API_ORIGIN=$API_ORIGIN yarn bundle-sdk 
ENV=$ENV API=$API BUILD_ORIGIN=$BUILD_ORIGIN API_ORIGIN=$API_ORIGIN yarn bundle-page-sdk-es6
ENV=$ENV API=$API BUILD_ORIGIN=$BUILD_ORIGIN API_ORIGIN=$API_ORIGIN ./build/scripts/publish.sh