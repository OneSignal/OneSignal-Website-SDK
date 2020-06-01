import Log from '../../../libraries/Log';
import { TagsObject } from '../../../models/Tags';
import TagUtils from '../../../utils/TagUtils';
import Context from '../../../models/Context';

export default class TagManager {
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
}