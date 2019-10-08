#!/bin/bash
ENV=$1
API=$2
ORIGIN=$3

ENV=$ENV API=$API yarn transpile:sources 
ENV=$ENV API=$API yarn bundle-sw 
ENV=$ENV API=$API yarn bundle-sdk 
ENV=$ENV API=$API yarn bundle-page-sdk-es6
ENV=$ENV API=$API ./build/scripts/publish.sh
