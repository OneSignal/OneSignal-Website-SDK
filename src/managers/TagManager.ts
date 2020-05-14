import Log from '../libraries/Log';

interface TagsObject {
    [key:string]: string|boolean|number;
}

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

    public toggleCheckedTag(tagKey: string, isChecked: boolean): void {
        this.tags[tagKey] = isChecked;
    }

    public async syncTags(): Promise<void> {
        if (!Object.keys(this.tags).length) {
            return;
        }
        Log.info("Updating tags from Category Slidedown:", this.tags);
        await OneSignal.sendTags(this.tags);
    }
}