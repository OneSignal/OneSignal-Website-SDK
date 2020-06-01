import Log from '../libraries/Log';

export default class TagUtils {
    static async tagHelperWithRetries(callback:Function, ms: number, maxTries: number): Promise<Object> {
        return  new Promise(async resolve => {
            callback().then(resolve)
            .catch( () => {
                if(!maxTries) {
                    resolve();
                } else {
                    setTimeout(() => {
                        Log.debug("Retrying tag request");
                        this.tagHelperWithRetries(callback, ms, maxTries-1).then(resolve);
                    }, ms);
                }
            });
        });
    }
}