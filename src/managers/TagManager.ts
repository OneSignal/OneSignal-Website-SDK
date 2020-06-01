import Log from '../libraries/Log';
import { TagsObject } from '../models/Tags';
import TagUtils from '../utils/TagUtils';

export default class TagManager {
    private tags: TagsObject = {};

    public async syncTags(): Promise<TagsObject|null> {
        Log.info("Updating tags from Category Slidedown:", this.tags);
        return await TagUtils.tagHelperWithRetries(OneSignal.sendTags.bind(this, this.tags), 1000, 5) as TagsObject;
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