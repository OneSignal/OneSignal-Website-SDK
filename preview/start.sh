#!/usr/bin/env bash
# Build the OneSignal Web SDK at the repo root for the requested env, then
# start the Vite-based preview dev server with SDK_ENV set so the middleware
# rewrites filename prefixes to match the build flavor on disk.
#
# Usage: ./start.sh <dev|staging|production>

set -euo pipefail

ENV="${1:-production}"

case "$ENV" in
  dev)        BUILD_SCRIPT="build:dev" ;;
  staging)    BUILD_SCRIPT="build:staging" ;;
  production) BUILD_SCRIPT="build:prod" ;;
  *)
    echo "error: unknown env '$ENV' (expected dev|staging|production)" >&2
    exit 1
    ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "[preview] Building SDK ($BUILD_SCRIPT)..."
( cd "$ROOT_DIR" && vp run "$BUILD_SCRIPT" )

echo "[preview] Starting dev server (SDK_ENV=$ENV)..."
cd "$SCRIPT_DIR"
SDK_ENV="$ENV" exec vp dev
