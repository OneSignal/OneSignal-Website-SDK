#!/usr/bin/env bash

# Installs dependencies to build SDK
npm ci

cd express_webpack

# Installs dependencies to run Sandbox for dev env
npm ci

# Sandbox cert generation
npm run certs

# Starts express_webpack node server
npm start

# Run the below 2 commands to rebuild the sdk
#   Since the build process uses both tsc and webpack there isn't a -watch option

# Start shell in docker
# docker-compose exec onesignal-web-sdk-dev bash
# Run each time to rebuild the SDK
# npm run build:dev
