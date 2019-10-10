# WebSDK Sandbox Environment
### Build Instructions
First: get a shell inside the container: `sudo docker-compose exec onesignal-web-sdk-dev bash`

From OneSignal-Website-SDK (root) directory, build the SDK by running one of the following:
1. This will assign the environment type to both the BUILD and API environment types
```
yarn build:<type>
```
2. This will assign the environment type accordingly:
```
yarn build:<type>-<type>
```
**Example**: `yarn build:dev-prod` builds the SDK with the BUILD environment as "development" and the API environment as "production"

#### CUSTOM ORIGIN PARAMS: 
You can pass two additional parameters to the above command, the first being the origin of the dev environment or the second being that of the api environment.

**Examples**:
```
yarn build:dev-prod texas
```
This sets the dev environment origin to `texas` which will result in SDK files being fetched from `https://texas:3001/sdks/`

```
yarn build:dev-dev texas <ip>
```
This sets the dev environment origin to `texas` which will result in SDK files being fetched from `https://texas:3001/sdks/` and the API environment origin to `<ip>` which will make all onesignal api calls to that origin such as `https://<ip>/api/v1/apps/<app>`

### Run Instructions
1. `docker-compose up`
   - If SSL certs need to be created, this will be done for you automatically with the common name default setting `texas`. This can be customized in `certs/gen-cert.sh`
2. Follow the following instructions (also logged in console)
   - copy `dev-ssl.crt` from container to host with: `docker cp <containerId>:sdk/express_webpack/certs/dev-ssl.crt .`
   - If you're running the container in a VM, get the cert file onto the VM's host (e.g: use `scp`)
   - add cert to keychain (mac OSX): `sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ~/dev-ssl.crt`