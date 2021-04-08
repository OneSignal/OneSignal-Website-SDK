# Running WebSDK Test Suite

## Overview
This repo's build and test environment is designed to run inside of a docker container. Ensure you have [Docker Desktop](https://www.docker.com/products/docker-desktop) and [VSCode](https://code.visualstudio.com/) installed before preceding. For details on how VSCode works with Docker see their [Developing inside a Container](https://code.visualstudio.com/docs/remote/containers) page.

## VSCode Run a specific test
_Tested up to VSCode Version: `1.54.2` with plugins: Remote Development `0.163.2`, and Testify `1.8.0`_
1. Install the ["Remote Development"](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.vscode-remote-extensionpack) VS Code Extension
   - Restart VSCode
2. You will be prompted that there is a Dev Container detected, press "reopen in a container"
   - If no prompt, press F1 and enter "Remote-Containers: Open Folder in Container.."
   > _NOTE: VScode Extensions you have already installed won't automatically installed on the dev container you are now running with now.
You will need install them again for this environment if you need them._
3. Install [Testify](https://marketplace.visualstudio.com/items?itemName=felixjb.testify) VS Code Extension
4. Open a specific test file and scroll to the exact test you want to run and click "Run Test" above it.

![image](https://user-images.githubusercontent.com/645861/111309395-133cfb00-8619-11eb-89ae-4570d2d06097.png)

> _NOTE: VScode Extensions you have already installed won't automatically installed on the dev container you are now running with now.
You will need install them again for this environment if you need them._

> _NOTE: The "Debug Test" next to "Run Test" does not work here. See "VSCode Debug a specific test" below on an alterative way to do this.

## VSCode Debug a specific test
_Tested up to VSCode Version: `1.54.2` plugins: Remote Development `0.163.2`_

0. Ensure you can run a specific test noted above first
1. Go to the test file you want to debug
2. Highlight a specific test, including the quotes
3. Do one of the following to start debugging
   - MacBook Touch Bar - Tap play button
   - Press F5
   - "Run" > "Start debugging"
   - Open "Run and Debug" on the left bar (or Control + Shift + D)
      - Select  "Debug AVA by selected test (w/ quotes)"

![image](https://user-images.githubusercontent.com/645861/111061933-ada31000-845a-11eb-86c9-851ef378c592.png)

If you need to configure any advanced parameters in the test edit `.vscode/launch.json`

## Run tests from CLI
> If you want to attach a debugger see "VSCode Debug a specific test" above as attaching a debugger is about 2x slower from the terminal.

> Since this project uses docker as the development environment we need to run our tests inside of the docker container.
The VSCode "Remote Development" extension automatically detects from the `.devcontainer` folder in this repo so any terminals you open in VSCode will automatically run inside the container.

Run these from `Terminal` > `New Terminal` in VSCode.
* Run all and watch file changes: `yarn test`
* Run all with no watch: `yarn test:noWatch`
* Run specific file: `<one of above commands> <path to file>`
   - e.g: `yarn test:noWatch test/unit/context/sw/ServiceWorker.ts`
* Run specific test in a file: `<one of above commands> <path to file> -m "name of test here"`
   - e.g: `yarn test:noWatch test/unit/context/sw/ServiceWorker.ts -m "onPushReceived - Ensure undefined payload does not show"`

![image](https://user-images.githubusercontent.com/645861/111320621-69fc0200-8624-11eb-80cd-bedf8c57a063.png)
