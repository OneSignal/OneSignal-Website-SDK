import Log from '../../../libraries/Log';
import { TagsObject } from '../../../models/Tags';
import TagUtils from '../../../utils/TagUtils';
import Context from '../../../models/Context';
import { ITagManager } from '../types';

/**
 * Manages tags for the TaggingContainer
 */
export default class TagManager implements ITagManager{
    // local tags from tagging container
    private tagValuesToUpdate: TagsObject = {};
    public playerTags: TagsObject = {};
    private context: Context;

    constructor(context: Context) {
        this.context = context;
    }

    public async sendTags(): Promise<TagsObject|null> {
        Log.info("Updating tags from Category Slidedown:", this.tagValuesToUpdate);
        const tagsWithNumberValues = TagUtils.convertTagBooleanValuesToNumbers(this.tagValuesToUpdate);
        const playerTagsWithNumberValues = TagUtils.convertTagStringValuesToNumbers(this.context.tagManager.playerTags);
        const diff = TagUtils.getObjectDifference(tagsWithNumberValues, playerTagsWithNumberValues);
        const finalTagsObject = TagUtils.getOnlyKeysObject(diff, tagsWithNumberValues);

        if (Object.keys(finalTagsObject).length === 0) {
            Log.warn("OneSignal: no change detected in Category preferences.");
            return {} as TagsObject;
        }
        try {
            return await OneSignal.sendTags(finalTagsObject) as TagsObject;
        } catch (e) {
            return null;
        }
    }

    public storeTagValuesToUpdate(tags: TagsObject): void {
        this.tagValuesToUpdate = tags;
    }

    static async getTags(): Promise<TagsObject> {
        const playerTags = await OneSignal.getTags();
        OneSignal.context.tagManager.playerTags = playerTags;
        return playerTags;
    }
}
