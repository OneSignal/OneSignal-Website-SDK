#!/usr/bin/env bash
# Build the OneSignal Web SDK at the repo root, then start the Vite-based
# preview dev server with SDK_ENV set so the middleware rewrites filename
# prefixes to match the build flavor on disk.
#
# Usage: ./start.sh <build-script> <sdk-env>
#   build-script: any script defined in the repo-root package.json
#                 (e.g. build:dev, build:dev-prod, build:staging, build:prod)
#   sdk-env:      dev | staging | production
#
# Example: ./start.sh build:dev-prod dev
#   builds the dev-flavored SDK pointed at the production API, then serves
#   it under the Dev- prefix.

set -euo pipefail

BUILD_SCRIPT="${1:?missing arg 1: build-script (e.g. build:dev, build:dev-prod)}"
SDK_ENV_ARG="${2:?missing arg 2: sdk-env (dev|staging|production)}"

case "$SDK_ENV_ARG" in
  dev|staging|production) ;;
  *)
    echo "error: unknown sdk-env '$SDK_ENV_ARG' (expected dev|staging|production)" >&2
    exit 1
    ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "[preview] Building SDK ($BUILD_SCRIPT)..."
( cd "$ROOT_DIR" && vp run "$BUILD_SCRIPT" )

echo "[preview] Starting dev server (SDK_ENV=$SDK_ENV_ARG)..."
cd "$SCRIPT_DIR"
SDK_ENV="$SDK_ENV_ARG" exec vp dev
