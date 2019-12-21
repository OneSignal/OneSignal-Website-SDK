import bowser from "bowser";
import {EnvironmentInfo, Browser} from '../models/EnvironmentInfo';

export class EnvironmentInfoHelper {
    public static getEnvironmentInfo() : EnvironmentInfo {
        return {
            browser : this.getBrowser(),
            browserVersion : this.getBrowserVersion(),
            isHttps : this.isHttps(),
            shouldAutoAccept : this.shouldAutoAccept()
        }
    }

    private static getBrowser() : Browser {
        if (bowser.chrome) return Browser.Chrome;
        if (bowser.firefox) return Browser.Firefox;
        if (bowser.msedge) return Browser.Edge;
        if (bowser.opera) return Browser.Opera;
        if (bowser.safari) return Browser.Safari;
        if (bowser.msie) return Browser.InternetExplorer;
        return Browser.Other;
    }

    private static getBrowserVersion() : number {
        return Number(bowser.version);
    }

    private static isHttps() : boolean {
        return location.protocol == 'https:';
    }

    private static shouldAutoAccept() : boolean {
        var autoAccept = true;

        // Firefox 72+ requires user-interaction. For HTTP prompt to work,
        // we need to set autoAccept to false
        if (this.getBrowser() === Browser.Firefox && this.getBrowserVersion() > 72) {
            autoAccept = false;
        }
        return autoAccept;
    }
}