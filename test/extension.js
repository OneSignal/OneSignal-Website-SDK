import { EXT_ID } from './vars';


export default class Extension {

    static get COMMANDS() {
        return {
            SET_NOTIFICATION_PERMISSION: 'SET_NOTIFICATION_PERMISSION',
        };
    }

    /**
     * Sets the site's notification permission setting.
     * @param siteUrl The match pattern URL for a website.
     * @param permission One of 'allow', 'block', 'ask', or 'clear'.
     */
    static setNotificationPermission(siteUrl, permission) {
        return new Promise((resolve, reject) => {
            Extension.message({
                    command: Extension.COMMANDS.SET_NOTIFICATION_PERMISSION,
                    siteUrl: siteUrl,
                    permission: permission
                })
                .then(reply => {
                    console.log('setNotificationPermission complete:', reply);
                })
                .catch(e => {
                    console.error('setNotificationPermission failed to reply successfully:', e);
                });
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