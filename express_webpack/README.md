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
**Example**: `yarn build:dev-prod --http` or `yarn build:dev-prod localhost --http`

#### CUSTOM ORIGIN PARAMS: 
You can pass two additional parameters to the above command, the first being the origin of the build environment and the second being that of the api environment. 

If no custom origins are set, defaults will be used: `localhost` for build and `onesignal.com` for api

**Examples**:
```
yarn build:dev-prod texas
```
This sets the dev environment origin to `texas` which will result in SDK files being fetched from `https://texas:4001/sdks/`

```
yarn build:dev-dev texas <ip>
```
This sets the dev environment origin to `texas` which will result in SDK files being fetched from `https://texas:4001/sdks/` and the API environment origin to `<ip>` which will make all onesignal api calls to that origin such as `https://<ip>:3001/api/v1/apps/<app>`

