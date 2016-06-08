import StackTrace from 'stacktrace-js';
import StackTraceGPS from 'stacktrace-gps';


// URLSearchParams.toString() does a second weird URL encoding so here we have to redo the URL encoding
export default class Utils {
    static urlSearchParamToString(params) {
        let string = '?';
        for (let entry of params.entries()) {
            string += `&${entry[0]}=${entry[1]}`
        }
        return string;
    }

    /**
     * Given a JavaScript error object, returns a more precise error using source maps.
     */
    static captureError(e) {
        return StackTrace.fromError(e)
            .then(stackFrame => {
                stackFrame = stackFrame[0];
                let gps = new StackTraceGPS();
                stackFrame.fileName = stackFrame.fileName.replace('https://127.0.0.1:3001/', 'https://webpushtest:3001/');
                stackFrame.source = stackFrame.source.replace('https://127.0.0.1:3001/', 'https://webpushtest:3001/');
                return gps.pinpoint(stackFrame);
            })
            .then(detailedError => {
                detailedError.fileName = detailedError.fileName.replace('webpack:///', 'webpack:///./');
                return `${e.name}: ${e.message} @ ${detailedError.fileName}:${detailedError.lineNumber}:${detailedError.columnNumber}`;
            })
            .catch(x => {
                console.error('Issue capturing error using StackTraceJS:', x);
                console.error('    Original Error:', e);
            });
    }
}