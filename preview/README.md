# Preview Builds

## WebSDK Sandbox Environment

A Vite-based sandbox for exercising a built OneSignal Web SDK against a real browser. The dev server is configured in `preview/vite.config.ts` and serves:

- `index.html`, `manifest.json`, `sw.js`, and the `/push/onesignal/` worker out of this folder
- `/sdks/web/v16/<file>` mapped to the SDK build output at `../build/releases/<file>`, with the filename prefix (`Dev-` / `Staging-` / unprefixed) chosen at runtime via `SDK_ENV`

### Run Instructions

1. From `preview/`, pick the script that matches what you want to test. Each script builds the SDK at the repo root first, then starts the dev server:

   ```
   cd preview
   vp run start            # alias for start:dev
   vp run start:dev        # local SDK against the production OneSignal API
   vp run start:dev-stag   # local SDK against staging (API_TYPE=staging, API_ORIGIN=onesignal.com)
   ```

   Both scripts produce a `BUILD_TYPE=development` build, so the SDK shim loads its ES6 bundle from `localhost:4001` rather than `cdn.onesignal.com`. They only differ in which OneSignal API origin the SDK talks to.

   `start:dev` calls the production API even though it's labeled "dev". This is because `build:dev` doesn't set `API`, and `__API_TYPE__` falls back to `'production'` at runtime via `src/shared/utils/env.ts`. If you need to point the SDK at a locally-running OneSignal backend, you'll need to also set `API=development API_ORIGIN=<host>` at build time (see `build:dev-dev` in the root `package.json`).

   The sandbox's `index.html` and `OneSignalSDKWorker.js` always reference `Dev-OneSignalSDK.*` URLs; the dev server's middleware rewrites the prefix on the way through based on `SDK_ENV` so the same HTML works against any build flavor. (A true `BUILD_TYPE=production` build is not wired up here because the prod shim hardcodes `cdn.onesignal.com` as its source — running it locally would just smoke-test the shim while loading the deployed prod SDK from CDN. Use `vp run build:prod` from the repo root if you specifically need to verify the prod shim + `size-limit` gates.)

   If you'd rather skip the rebuild (already-built bytes in `build/releases/`), invoke `SDK_ENV=<dev|staging|production> vp dev` directly from `preview/`. For live rebuilds during SDK iteration, run `vp run build:dev:watch` from the repo root in another terminal alongside `vp dev`.

   On first run, [vite-plugin-mkcert](https://github.com/liuweiGL/vite-plugin-mkcert) downloads the `mkcert` binary, installs a local root CA into your system trust store, and issues a cert for `localhost` (plus a few common hostname aliases). After that, every preview run reuses the same trusted cert with no manual steps. If you'd rather pre-install `mkcert` yourself: `brew install mkcert` on macOS, then `mkcert -install`.

2. Visit [https://localhost:4001?app_id=&lt;your-app-id&gt;](https://localhost:4001) and pass your OneSignal app id as a URL query parameter.

### Build Instructions

From the repo root, build the SDK with one of:

```
vp run build:<env>
```

Where `<env>` is `dev`, `staging`, or `prod`. Or set BUILD and API environments independently:

```
vp run build:<build-env>-<api-env>
```

**Example:** `vp run build:dev-prod` builds with the BUILD environment as `development` and the API environment as `production`.

### CUSTOM ORIGIN PARAMS

You can override the build and API origins via environment variables:

- `BUILD_ORIGIN`
- `API_ORIGIN`

Defaults are `localhost` for build and `onesignal.com` for api.

**Note:** make sure custom origins make sense with respect to the build and api environments set (e.g. you cannot use a `prod` api environment and expect a custom api origin to be used).

**Examples:**

```
API_ORIGIN=texas vp run build:dev-prod
```

Sets the BUILD environment origin to `texas` (so SDK files are fetched from `https://texas:4001/sdks/web/v##/`) and the API environment origin to production (so all OneSignal API calls go to `https://api.onesignal.com/apps/<app>`).

```
BUILD_ORIGIN=localhost API_ORIGIN=texas vp run build:dev-dev
```

Sets the BUILD origin to `localhost` (SDK files from `https://localhost:4001/sdks/web/v##/`) and the API origin to `https://texas:3001/api/v1/apps/<app_id>`.

### HTTP

All builds default to `https` unless `HTTPS=false` is passed:

```
HTTPS=false vp run build:dev-prod
```

The preview server itself also accepts `HTTPS=false` to bind HTTP on port 4002 instead of HTTPS on 4001:

```
HTTPS=false vp run start
```

Note: the service worker import path in `push/onesignal/OneSignalSDKWorker.js` is hard-coded to `https://localhost:4001/...`, so push subscription flows require HTTPS mode.

### NOTE ON PORTS

**SDK:** SDK files are fetched from the 4000s ports depending on the HTTP/S setting:

- HTTP: `4002`
- HTTPS: `4001`

Use `NO_DEV_PORT=true` at build time to omit the port number entirely. Useful with reverse proxies like [ngrok](https://ngrok.com/).

**API:** dev-environment API calls go to port `3001` (e.g. `<custom-origin>:3001`).

### Running in combination with the OneSignal backend (dev-dev)

To run the WebSDK sandbox against a local OneSignal backend with `dev-dev`:

1. Make sure your browser can make secure connections to wherever your OneSignal backend is running. This may involve adding a cert to your keychain and/or visiting the backend's frontend (Dashboard) and allowing the browser to proceed past the "unsafe" warning.

2. If the OneSignal backend is on a different machine, add a hosts alias you can pass as the API environment option at build time:

   ```
   // file: /etc/hosts

   192.168.40.21 texas
   ```

   See above for an example using `texas` as the API environment option.

3. Make sure the OneSignal backend is using URLs to your locally-served WebSDK build files. Update the URLs in `development.rb` to point to the absolute paths in the `build` directory after running `vp run build:<>-<>`.

## Troubleshooting

### Custom origin mismatch

Check the network tab in browser dev tools to see which origin the SDK is using for network calls. If you set `API_ORIGIN` to something other than `onesignal.com` but the SDK is still using that, double-check the build command. For example, setting the origin to `staging.onesignal.com` requires `dev-stag`, not `dev-prod` (the `prod` environment ignores the custom api origin parameter).

## Debugging Tips for OneSignal WebSDK Sandbox

### To clear your state

1. Inspect → Application → Clear Site Data button

   ![image](https://github.com/user-attachments/assets/701e3da1-0c15-4940-a47b-feab55e2b953)

2. Click the button left of the URL, remove notification permission

   ![image](https://github.com/user-attachments/assets/72d718a6-15da-4261-8919-2a2b565d1db3)

### In the event of weird errors (cannot find your application, it is not configured correctly, etc.)

1. Inspect → Network → Disable Cache

   ![image](https://github.com/user-attachments/assets/83950e91-7278-4f96-8c75-577797cc9697)

2. Refresh
