import { EXT_ID } from './vars';


export default class Extension {

    static get COMMANDS() {
        return {
            SET_NOTIFICATION_PERMISSION: 'SET_NOTIFICATION_PERMISSION',
            CREATE_BROWSER_TAB: 'CREATE_BROWSER_TAB',
            EXECUTE_SCRIPT: 'EXECUTE_SCRIPT'
        };
    }

    /**
     * Sets the site's notification permission setting.
     * @param siteUrl The match pattern URL for a website.
     * @param permission One of 'allow', 'block', 'ask', or 'clear'.
     */
    static setNotificationPermission(siteUrl, permission) {
        return Extension.message({
            command: Extension.COMMANDS.SET_NOTIFICATION_PERMISSION,
            siteUrl: siteUrl,
            permission: permission
        });
    }

    /**
     * Creates a new Chrome browser tab.
     * @param url The URL the browser tab should initially navigate to.
     * @param active Whether the new tab should be in active focus.
     */
    static createBrowserTab(url, active) {
        return Extension.message({
                command: Extension.COMMANDS.CREATE_BROWSER_TAB,
                url: url,
                active: active
            });
    }

    /**
     * Executes a script in the top frame of the current tab.
     * @param code A string of JavaScript code to execute.
     */
    static executeScript(code) {
        return Extension.message({
            command: Extension.COMMANDS.EXECUTE_SCRIPT,
            code: code
        });
    }


    static message(data) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(EXT_ID, data, {},
                response => {
                    if (!response) {
                        reject(chrome.runtime.lastError);
                    }
                    else if (response.success) {
                        resolve(response);
                    }
                    else {
                        reject(response);
                    }
                });
        });
    }
}

window.Extension = Extension;