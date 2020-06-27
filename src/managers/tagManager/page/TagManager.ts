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

    public async sendTags(): Promise<TagsObject|null> {
        Log.info("Updating tags from Category Slidedown:", this.tags);
        const tagsWithNumberValues = TagUtils.convertTagBooleanValuesToNumbers(this.tags);
        return await OneSignal.sendTags(tagsWithNumberValues) as TagsObject;
    }

    public storeTagValuesToUpdate(tags: TagsObject): void {
        this.tags = tags;
    }

    static async getTags(): Promise<TagsObject> {
        return <TagsObject> await OneSignal.getTags();
    }
}