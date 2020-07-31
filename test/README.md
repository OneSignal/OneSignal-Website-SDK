# Testing the WebSDK

## Testing Commands
1. Run all and watch file changes: `yarn test`
2. Run all with no watch: `yarn test:noWatch`
3. Run specific file: `<one of above commands> <path to transpiled file>` e.g: `yarn test:noWatch build/ts-to-es6/test/unit/managers/ConfigManager.js`

## VSCode Testing Current File
1. To test the current file, make sure you have set up the following run configuration in the `.vscode/launch.json` file:
   - Tested up to VSCode Version: `1.46.1`
      - (later versions seem to have broken debugging)
```
{
    // Use IntelliSense to learn about possible attributes.
    // Hover to view descriptions of existing attributes.
    // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Transpile & Run",
            "preLaunchTask": "transpile",
            "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/ava",
            "runtimeArgs": [
                "debug",
                "--break",
                "--verbose",
                "--color",
                "--serial",
                "--watch=false",
                "build/ts-to-es6/test/**/${fileBasenameNoExtension}.js",
            ],
            "request": "launch",
            "skipFiles": [
                "<node_internals>/**"
            ],
            "type": "node",
            "outputCapture": "std",
            "port": 9229,
            "sourceMaps": true,
            "trace": true,
            "protocol": "auto",
            "console": "integratedTerminal"
        },
        {
            "name": "Run",
            "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/ava",
            "runtimeArgs": [
                "debug",
                "--break",
                "--verbose",
                "--color",
                "--watch=false",
                "--fail-fast=false",
                "build/ts-to-es6/test/**/${fileBasenameNoExtension}.js",
            ],
            "request": "launch",
            "skipFiles": [
                "<node_internals>/**"
            ],
            "type": "node",
            "outputCapture": "std",
            "port": 9229,
            "sourceMaps": true,
            "trace": true,
            "protocol": "auto",
            "console": "integratedTerminal"
        },
    ]
}
```

2. Go to the test file and tap the play button (MacBook Touch Bar) or go to **Run > Start debugging**