import Log from '../libraries/Log';
import { TagsObject } from '../models/Tags';

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

    static convertTagBooleanValuesToNumbers(tags: TagsObject): TagsObject {
        Object.keys(tags).forEach(key => {
            tags[key] = Number(tags[key]);
        });
        return tags;
    }
}