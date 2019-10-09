# WebSDK Sandbox Environment
### Build Instructions
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
yarn build:dev-prod oregon
```
This sets the dev environment origin to `oregon` which will result in SDK files being fetched from `https://oregon:3001/sdks/`

```
yarn build:dev-dev oregon <ip>
```
This sets the dev environment origin to `oregon` which will result in SDK files being fetched from `https://oregon:3001/sdks/` and the API environment origin to `<ip>` which will make all onesignal api calls to that origin such as `https://<ip>/api/v1/apps/<app>`

### Run Instructions
1. Generate SSL certs from this directory: `yarn certs`
2. Add `.crt` output file from `certs` directory to keychain on machine with target test browser: `sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ~/dev-ssl.crt`
3. Add `<ip> oregon` to `/etc/hosts` file where ip is the ip of the machine serving SDK
4. From this directory, run `yarn start`
5. Go to `https://oregon:3001`