# Running WebSDK Test Suite

## VSCode Run a specific test
_Tested up to VSCode Version: `1.54.2`_
1. Install the ["Remote Development"](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.vscode-remote-extensionpack) VS Code Extension
   - Restart VSCode
2. You will be prompted that there is a Dev Container detected, press "reopen in a container"
   - If no prompt, press F1 and enter "Remote-Containers: Open Folder in Container.."
3. Install [Testify](https://marketplace.visualstudio.com/items?itemName=felixjb.testify) VS Code Extension
4. Go to the test file you want to run and click "Run Test" above the name.

> _NOTE: VScode Extensions you have already installed won't automatically installed on the dev container you are now running with now.
You will need install them again for this environment if you need them._

## VSCode Debug a specific test
_Tested up to VSCode Version: `1.54.2`_

0. Ensure you can run a specific test noted above first
1. Go to the test file you want to debug
2. Highlight a specific test, including the quotes
3. Do one of the following to start debugging
   - MacBook Touch Bar - Tap play button 
   - Press F5
   - "Run" > "Start debugging"
   - Open "Run and Debug" on the left bar (or Control + Shift + D)
      - Select  "Debug AVA by selected test (w/ quotes)"

If you need to configure any advanced parameters in the test edit `.vscode/launch.json`

## Testing from CLI
1. Run all and watch file changes: `yarn test`
2. Run all with no watch: `yarn test:noWatch`
3. Run specific file: `<one of above commands> <path to file>`
   - e.g: `yarn test:noWatch test/unit/context/sw/ServiceWorker.ts`
3. Run specific test in a file: `<one of above commands> <path to file> -m "name of test here"`
   - e.g: `yarn test:noWatch test/unit/context/sw/ServiceWorker.ts -m "onPushReceived - Ensure undefined payload does not show"`