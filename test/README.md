# Running WebSDK Test Suite

## Overview

Tests are built to run with the [AVA test runner](https://github.com/avajs/ava) with Node.js. The test suite can be run via docker or directly on your machine as we will cover both options below.

## Requirements

1. Install [VSCode](https://code.visualstudio.com/)
2. Follow option 1 OR option 2 below

### Option 1 - Run locally

> Recommend for macOS or if you haven't used or setup docker before.

1. Install the specific version of Node.js defined in the Github Actions `ci.yml` in this repo.

### Option 2 - Run with Docker

> NOT Recommend for macOS due to performance issues, about 10x slower.
> Recommend for Linux or Windows 10 (w/ WSL2) and have worked with docker before.

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop).
2. Install the ["Remote Development"](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.vscode-remote-extensionpack) VS Code Extension
   - For details on how VSCode works with Docker see their [Developing inside a Container](https://code.visualstudio.com/docs/remote/containers) page.
3. Restart VSCode
4. You will be prompted that there is a Dev Container detected, press "reopen in a container"
   - If no prompt, press F1 and enter "Remote-Containers: Open Folder in Container.."
     > _NOTE: VScode Extensions you have already installed won't automatically installed on the dev container you are now running with now.
     > You will need install them again for this environment if you need them._

### Install VS Code Extension Testify

1. Install [Testify](https://marketplace.visualstudio.com/items?itemName=felixjb.testify) VS Code Extension

## VSCode Run a specific test

_Tested up to VSCode Version: `1.54.2` with plugins: Remote Development `0.163.2`, and Testify `1.8.0`_

1. Open a specific test file and scroll to the exact test you want to run and click "Run Test" above it.

![image](https://user-images.githubusercontent.com/645861/111309395-133cfb00-8619-11eb-89ae-4570d2d06097.png)

> _NOTE: VScode Extensions you have already installed won't automatically installed on the dev container you are now running with now.
> You will need install them again for this environment if you need them._

> \_NOTE: The "Debug Test" next to "Run Test" does not work here. See "VSCode Debug a specific test" below on an alterative way to do this.

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
     - Select "Debug AVA by selected test (w/ quotes)"

![image](https://user-images.githubusercontent.com/645861/111061933-ada31000-845a-11eb-86c9-851ef378c592.png)

If you need to configure any advanced parameters in the test edit `.vscode/launch.json`

## Run tests from CLI

> If you want to attach a debugger see "VSCode Debug a specific test" above as attaching a debugger is about 2x slower from the terminal.

> If you are using Docker as the development environment make sure you are using tests inside of the docker container.
> The VSCode "Remote Development" extension automatically detects from the `.devcontainer` folder in this repo so any terminals you open in VSCode will automatically run inside the container.

Run these from `Terminal` > `New Terminal` in VSCode.

- Run all and watch file changes: `npm run test`
- Run all with no watch: `npm run test:noWatch`
- Run specific file: `<one of above commands> <path to file>`
  - e.g: `npm run test:noWatch test/unit/context/sw/ServiceWorker.ts`
- Run specific test in a file: `<one of above commands> <path to file> -m "name of test here"`
  - e.g: `npm run test:noWatch test/unit/context/sw/ServiceWorker.ts -m "onPushReceived - Ensure undefined payload does not show"`

![image](https://user-images.githubusercontent.com/645861/111320621-69fc0200-8624-11eb-80cd-bedf8c57a063.png)

## Troubleshooting

### `env: node: No such file or directory` (debugger doesn't attach)

If you are on a Mac using something like iTerm and Zsh, change your Explorer Kind setting to `external` in your VSCode settings ([see thread](https://github.com/jest-community/vscode-jest/issues/105#issuecomment-642732699)).

If you used `nvm` to install your node version, you may need to add the following to your zshrc or bashrc file:

```
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" # This loads nvm
```
