# Express Webpack
## WebSDK Sandbox Environment
### Run Instructions
1. `docker-compose up`
   - If SSL certs need to be created, this will be done for you automatically with the common name default setting `texas` and alternative DNS names (this can be customized in `certs/gen-cert.sh`):
      - localhost
      - california
      - oregon
      - washington

2. Follow the following instructions (also logged in console)
   - copy `dev-ssl.crt` from container to host with:
      ```
      docker cp "$(docker-compose ps -q onesignal-web-sdk-dev)":sdk/express_webpack/certs/dev-ssl.crt .
      ```
   - If you're running the container in a VM, get the cert file onto the VM's host (e.g: use `scp`)
   - add cert to keychain (mac OSX):
      ```
      sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain dev-ssl.crt
      ```
3. Make sure the common name (e.g: localhost, texas, oregon, etc...) maps to the correct IP in your `/etc/hosts` file
4. Visit [https://localhost:4001?app_id=](https://localhost:4001?app_id=) and insert your app id as a URL query parameter

#### AMP Sandbox
Visit [https://localhost:4001/amp?app_id=](https://localhost:4001/amp?app_id=) and insert your app id as a URL query parameter


### Build Instructions
First: get a shell inside the container: `docker-compose exec onesignal-web-sdk-dev bash`

From OneSignal-Website-SDK (root) directory, build the SDK by running one of the following:
1. This will assign the environment type to both the BUILD and API environment types
```
yarn build:<type>
```
   - Options are:
      - `dev`
      - `stag`
      - `prod`
2. This will assign the environment type accordingly:
```
yarn build:<type>-<type>
```
**Example**: `yarn build:dev-prod` builds the SDK with the BUILD environment as "development" and the API environment as "production"

### CUSTOM ORIGIN PARAMS:
You can pass two additional parameters to the above command, the first being the origin of the build environment and the second being that of the api environment. These parameters use option flags.

   - Option flags are:
      - `-b` or `--build`
      - `-a` or `--api`

If no custom origins are set, defaults will be used: `localhost` for build and `onesignal.com` for api.

**Note:** make sure custom origins make sense with respect to the build and api environments set (e.g: you cannot use a `prod` api environment and expect a custom api origin to be used).

**Examples**:
```
yarn build:dev-prod -b texas
```
This sets the BUILD environment origin to `texas` which will result in SDK files being fetched from `https://texas:4001/sdks/` and the API environment origin to production which will make all onesignal api calls to the production origin `https://onesignal.com/api/v1/apps/<app>`

```
yarn build:dev-dev -b localhost -a texas
```
This sets the BUILD environment origin to `localhost` which will result in SDK files being fetched from `https://localhost:4001/sdks/` and the API environment origin to the default `https://texas:3001/api/v1/apps/<app_id>`

### HTTP
All builds default to `https` unless `--http` is passed to the end of the build command...

**Example**: `yarn build:dev-prod --http` or `yarn build:dev-prod -b localhost --http`

### NOTE ON PORTS:
**SDK**: SDK files will automatically be fetched from the 4000s ports depending on the HTTP/S setting
   - HTTP: `4000`
   - HTTPS: `4001`

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
   - change the URLs in the file `development.rb` so that they point to the files' absolute paths (these are the files in the `build` directory after running `yarn build:<>-<>`)

4. Remove the `$PREFIX` var from the `publish.sh` script for all map files

## Troubleshooting
### Custom origin mismatch
Check the network tab in the browser dev tools to see what origin the SDK is using for network calls. If you set the `-a` flag origin to something other than `onesignal.com` but it is still using that, make sure you are using the correct build command. For example, if you set the origin to `staging.onesignal.com` you should *not* be using the `dev-prod` environment since the `prod` will result in the ignoring of the custom origin parameter. The fix in this case would be to use `dev-stag`.

### Map files aren't working correctly
The source map files let tools (e.g: the browser dev tools Source tab) map between the emitted JS code and the TypeScript source. If you notice the debugger acting up (e.g: breakpoints don't hit or set correctly) chances are the problem is with your map files. Make sure you remove the `$PREFIX` var from the `publish.sh` script for all `.map` files. Rebuild.

### Sass build error
If you get the error `Node Sass could not find a binding for your current environment: Linux 64-bit with Node.js 12.` try running the following:

```
npm rebuild node-sass
```

from *inside* the docker container shell.