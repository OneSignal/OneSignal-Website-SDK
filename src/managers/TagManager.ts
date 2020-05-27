import Log from '../libraries/Log';
import { TagsObject } from '../models/Tags';

export default class TagManager {
    private tags: TagsObject = {};

    public async tagHelperWithRetries(callback:Function, ms: number, maxTries: number): Promise<Object> {
        return  new Promise(async (resolve, reject) => {
            callback().then(resolve)
            .catch( e => {
                if(!maxTries) {
                    reject(new Error(`Could not execute tag request:${e}`));
                } else {
                    setTimeout(() => {
                        Log.debug("Retrying tag request");
                        this.tagHelperWithRetries(callback, ms, maxTries-1).then(resolve);
                    }, ms);
                }
            });
        });
    }

    public async syncTags(): Promise<TagsObject|null> {
        Log.info("Updating tags from Category Slidedown:", this.tags);
        try {
            return await this.tagHelperWithRetries(OneSignal.sendTags.bind(this, this.tags), 1000, 5) as TagsObject;
        } catch (e) {
            return null;
        }
    }

    public storeTagValuesToUpdate(): void {
        this.tags = this.getValuesFromTaggingContainer();
    }

    private getValuesFromTaggingContainer(): TagsObject {
        const selector = "#slidedown-body > div.tagging-container > div > label > input[type=checkbox]";
        const inputNodeArr = document.querySelectorAll(selector);
        const tags: TagsObject = {};
        inputNodeArr.forEach(node => {
            tags[(<HTMLInputElement>node).defaultValue] = Number((<HTMLInputElement>node).checked); // 1|0
        });
        return tags;
    }
}