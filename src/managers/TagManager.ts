import Log from '../libraries/Log';
import { TagsObject } from '../models/Tags';

export default class TagManager {
    private tags: TagsObject = {};

    public async tagFetchWithRetries(ms: number, maxTries: number): Promise<Object> {
        return  new Promise(async (resolve, reject) => {
            OneSignal.getTags()
            .then(resolve)
            .catch(()=>{
                if(!maxTries) return reject('Could not fetch tags');
                setTimeout(()=>{
                    Log.debug("Retrying getTags");
                    this.tagFetchWithRetries(ms, maxTries-1).then(resolve);
                }, ms);
            });
        });
    }

    public async syncTags(): Promise<void> {
        Log.info("Updating tags from Category Slidedown:", this.tags);
        await OneSignal.sendTags(this.tags); // TO DO: retries?
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