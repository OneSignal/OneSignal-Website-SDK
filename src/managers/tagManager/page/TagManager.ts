import Log from '../../../libraries/Log';
import { TagsObject } from '../../../models/Tags';
import TagUtils from '../../../utils/TagUtils';
import Context from '../../../models/Context';
import { ITagManager } from '../types';

export default class TagManager implements ITagManager{
    // local tags from tagging container
    private tags: TagsObject = {};
    private context: Context;

    constructor(context: Context) {
        this.context = context;
    }

    public async syncTags(): Promise<TagsObject|null> {
        Log.info("Updating tags from Category Slidedown:", this.tags);
        const tagsWithNumberValues = TagUtils.convertTagBooleanValuesToNumbers(this.tags);
        return await TagUtils.tagHelperWithRetries(
            OneSignal.sendTags.bind(this, tagsWithNumberValues),
            1000, 5) as TagsObject;
    }

    public storeTagValuesToUpdate(tags: TagsObject): void {
        this.tags = tags;
    }

    static async downloadTags(): Promise<TagsObject> {
        return <TagsObject> await new Promise(resolve => {
            resolve(TagUtils.tagHelperWithRetries(OneSignal.getTags, 1000, 5));
        });
    }
}