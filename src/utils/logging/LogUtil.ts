import { Solarized } from "../colors/Solarized";
import { InvalidArgumentError } from "../../errors/InvalidArgumentError";

enum LogStyle {
    PlainText,
    Label
}

class LogUtil {

    private static getModuleName(module) {
        if (!module)
            throw new InvalidArgumentError('module', module);
        if (typeof module === 'string') {
            return module;
        } else if (module.constructor && module.constructor.name) {
            return module.constructor.name;
        }
    }

    private static getStyle(style: LogStyle) {
        switch (style) {
            case LogStyle.Label:
                return `
                    font-family: 'Proxima Nova', 'Helvetica', 'Arial', sans-serif;
                    font-size: 85%;
                    padding: 0.2em 0.5em;
                    margin-right: 0.5em;
                    background: ${Solarized.BASE2};
                    border-radius: 3px;
                    border: 1px solid #d4cfbc;
                    color: ${Solarized.YELLOW};
                    text-transform: uppercase;
                `;
            case LogStyle.PlainText:
                return ``;
        }
    }

    /**
     * Example:
     *   Log.debug(...LogUtil.format('<COMPONENT NAME>', '<YOUR MESSAGE>', <ARG 1>, <ARG 2>, ...));
     */
    static format(module, ...message) {
        return [
            `%c${LogUtil.getModuleName(module)}` +
            `%c`,
            LogUtil.getStyle(LogStyle.Label),
            LogUtil.getStyle(LogStyle.PlainText),
            ...message
        ];
    }
}

export { LogUtil };
