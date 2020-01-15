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
      docker cp <containerId>:sdk/express_webpack/certs/dev-ssl.crt .
      ```
   - If you're running the container in a VM, get the cert file onto the VM's host (e.g: use `scp`)
   - add cert to keychain (mac OSX): 
      ```
      sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain dev-ssl.crt
      ```
3. Make sure the common name (e.g: localhost, texas, oregon, etc...) maps to the correct IP in your `/etc/hosts` file
4. Visit [https://localhost:4001?app_id=](https://localhost:4001?app_id=) and insert your app id as a URL query parameter

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

### HTTP
All builds default to `https` unless `--http` is passed to the end of the build command...
**Example**: `yarn build:dev-prod --http` or `yarn build:dev-prod -b localhost --http`

#### CUSTOM ORIGIN PARAMS: 
You can pass two additional parameters to the above command, the first being the origin of the build environment and the second being that of the api environment. These parameters use option flags. 

   - Option flags are:
      - `-b` or `--build`
      - `-a` or `--api`

If no custom origins are set, defaults will be used: `localhost` for build and `onesignal.com` for api. 

**Note:**: make sure custom origins make sense with respect to the build and api environments set (e.g: you cannot use a `prod` api environment and expect a custom api origin to be used).

**Examples**:
```
yarn build:dev-prod -b texas
```
This sets the BUILD environment origin to `localhost` which will result in SDK files being fetched from `https://localhost:4001/sdks/` and the API environment origin to `localhost` which will make all onesignal api calls to that origin such as `https://localhost:3001/api/v1/apps/<app>`

```
yarn build:dev-dev -b texas -a <ip>
```
This sets the BUILD environment origin to `texas` which will result in SDK files being fetched from `https://texas:4001/sdks/` and the API environment origin to the default `https://onesignal.com/api/v1/apps/<app_id>`

#### NOTE ON PORTS:
**SDK**: SDK files will automatically be fetched from the 4000s ports depending on the HTTP/S setting
   - HTTP: `4000`
   - HTTPS: `4001`

**API**: dev-environment API calls will be made to the `3001` port (e.g: `<custom-origin>:3001`)