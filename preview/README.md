# Preview Builds

## WebSDK Sandbox Environment

### Run Instructions

1. `docker-compose up`

   - If SSL certs need to be created, this will be done for you automatically with the common name default setting `localhost` and alternative DNS names (this can be customized in `certs/gen-cert.sh`):
     - texas
     - california
     - oregon
     - washington

2. Follow the following instructions (also logged in console)
   - copy `dev-ssl.crt` from container to host with:
     ```
     docker cp "$(docker-compose ps -q onesignal-web-sdk-dev)":sdk/preview/certs/dev-ssl.crt .
     ```
     - If you're running the container in a VM, get the cert file onto the VM's host (e.g: use `scp`)
   - Add cert to system's trusted store
     - macOS: `sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain dev-ssl.crt`
     - Windows: `Import-Certificate -FilePath dev-ssl.crt -CertStoreLocation cert:\CurrentUser\Root`
3. Make sure the common name (e.g: localhost, texas, oregon, etc...) maps to the correct IP in your `/etc/hosts` file
4. Visit [https://localhost:4001?app_id=](https://localhost:4001?app_id=) and insert your app id as a URL query parameter

#### AMP Sandbox

Visit [https://localhost:4001/amp?app_id=](https://localhost:4001/amp?app_id=) and insert your app id as a URL query parameter

### Build Instructions

First: get a shell inside the container: `docker-compose exec onesignal-web-sdk-dev bash`

From OneSignal-Website-SDK (root) directory, build the SDK by running one of the following:

1. This will assign the environment type to both the BUILD and API environment types

```
npm run build:<type>
```

- Options are:
  - `dev`
  - `staging`
  - `prod`

2. This will assign the environment type accordingly:

```
npm run build:<type>-<type>
```

**Example**: `npm run build:dev-prod` builds the SDK with the BUILD environment as "development" and the API environment as "production"

### CUSTOM ORIGIN PARAMS:

You can pass two additional variables to the above command, the first being the origin of the build environment and the second being that of the api environment. These env vars are:

- BUILD_ORIGIN
- API_ORIGIN

If no custom origins are set, defaults will be used: `localhost` for build and `onesignal.com` for api.

**Note:** make sure custom origins make sense with respect to the build and api environments set (e.g: you cannot use a `prod` api environment and expect a custom api origin to be used).

**Examples**:

```
API_ORIGIN=texas npm run build:dev-prod
```

This sets the BUILD environment origin to `texas` which will result in SDK files being fetched from `https://texas:4001/sdks/web/v##/` and the API environment origin to production which will make all onesignal api calls to the production origin `https://onesignal.com/api/v1/apps/<app>`

```
BUILD_ORIGIN=localhost API_ORIGIN=texas npm run build:dev-dev
```

This sets the BUILD environment origin to `localhost` which will result in SDK files being fetched from `https://localhost:4001/sdks/web/v##/` and the API environment origin to the default `https://texas:3001/api/v1/apps/<app_id>`

### HTTP

All builds default to `https` unless `HTTPS=false` is passed to the build command...

**Example**: `HTTPS=false npm run build:dev-prod` or `HTTPS=false BUILD_ORIGIN=localhost npm run build:dev-prod`

### NOTE ON PORTS:

**SDK**: SDK files will automatically be fetched from the 4000s ports depending on the HTTP/S setting

- HTTP: `4000`
- HTTPS: `4001`

Use the **`NO_DEV_PORT=true`** build env var to build without a port number. This is useful when using a reverse proxy like [ngrok](https://ngrok.com/) to serve your localhost environment on the web.

**API**: dev-environment API calls will be made to the `3001` port (e.g: `<custom-origin>:3001`)

### Running in Combination with OneSignal Container (dev-dev)

You may want to run the Web SDK Sandbox with the configuration `dev-dev`. You will need to make sure to follow some steps first so that both the **Express Webpack** and **OneSignal** containers work in conjunction...

1. Make sure your browser can make secure connections to wherever your OneSignal container is running, VM or otherwise. This may involve adding a cert to your keychain and/or visiting the container's frontend (Dashboard) and allowing the browser to proceed past the "unsafe" warning.

2. If you are running the OneSignal container on a machine with a different IP address, add an alias to your hosts file which you can then use easily in your API environment option at build time.

   ```
   // file: /etc/hosts

   192.168.40.21 texas
   ```

   See above for example on using `texas` as the API environment option

3. Make sure that the OneSignal container is using the URLs to your WebSDK container's build files. To do this,

   - change the URLs in the file `development.rb` so that they point to the files' absolute paths (these are the files in the `build` directory after running `npm run build:<>-<>`)

## Troubleshooting

### Custom origin mismatch

Check the network tab in the browser dev tools to see what origin the SDK is using for network calls. If you set the `API_ORIGIN` var to something other than `onesignal.com` but it is still using that, make sure you are using the correct build command. For example, if you set the origin to `staging.onesignal.com` you should _not_ be using the `dev-prod` environment since the `prod` will result in the ignoring of the custom origin parameter. The fix in this case would be to use `dev-stag`.

## Debugging Tips for OneSignal WebSDK Sandbox

### To clear your state:

1. Inspect -> Application -> Clear Site Data button

![image](https://github.com/user-attachments/assets/701e3da1-0c15-4940-a47b-feab55e2b953)

2. Click button left of URL, remove notification permission

![image](https://github.com/user-attachments/assets/72d718a6-15da-4261-8919-2a2b565d1db3)

### In the event of weird errors (can not find your application, it is not configured correctly, etc):

1. Inspect -> Network -> Disable Cache

![image](https://github.com/user-attachments/assets/83950e91-7278-4f96-8c75-577797cc9697)

2. Refresh
