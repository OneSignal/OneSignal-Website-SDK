import Log from '../libraries/Log';

interface TagObject {
    [key:string]: any;
}

export default class TagManager {
    private checkedTags: Array<string> = [];

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

    public toggleCheckedTag(tag: string): void {
        const tagIndex = this.checkedTags.indexOf(tag);
        if (tagIndex === -1) {
            this.checkedTags.push(tag);
        } else {
            this.checkedTags.splice(tagIndex, 1);
        }
    }

    public async updateRemoteTags(): Promise<void> {
        if (!this.checkedTags.length) {
            return;
        }
        Log.info("Updating tags from Category Slidedown:", this.checkedTags);
        const payload: TagObject = {};
        this.checkedTags.forEach(async tag => {
            payload[tag] = true;
        });
        await OneSignal.sendTags(payload);
    }
}