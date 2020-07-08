import Log from '../../../libraries/Log';
import { TagsObject } from '../../../models/Tags';
import TagUtils from '../../../utils/TagUtils';
import Context from '../../../models/Context';
import { ITagManager } from '../types';
import { assertObjectValuesType } from '../../../../src/utils';

/**
 * Manages tags for the TaggingContainer
 */
export default class TagManager implements ITagManager{
    // local tags from tagging container
    private tagsFromTaggingContainer: TagsObject = {};
    public remoteTags: TagsObject = {};
    private context: Context;

    constructor(context: Context) {
        this.context = context;
    }

    /**
     * @param  {boolean} isInUpdateMode
     * @returns Promise resolving TagsObject if successful, {} if no change detected, null if failed
     */
    public async sendTags(isInUpdateMode: boolean): Promise<TagsObject|null> {
        Log.info("Updating tags from Category Slidedown:", this.tagsFromTaggingContainer);

        let finalTagsObject;
        const localTagsWithNumberValues = TagUtils.convertTagBooleanValuesToNumbers(this.tagsFromTaggingContainer);

        if (!isInUpdateMode) {
            finalTagsObject = TagUtils.getTruthyValuePairsFromNumbers(localTagsWithNumberValues);
        } else {
            finalTagsObject = TagManager.getTagsToUpdate(localTagsWithNumberValues, this.remoteTags);
        }

        if (Object.keys(finalTagsObject).length === 0) {
            Log.warn("OneSignal: no change detected in Category preferences. Abort tag update.");
            // no change detected, return {}
            return {} as TagsObject;
        }
        try {
            return await OneSignal.sendTags(finalTagsObject) as TagsObject;
        } catch (e) {
            return null;
        }
    }

    public storeTagValuesToUpdate(tags: TagsObject): void {
        assertObjectValuesType(tags, "boolean");
        this.tagsFromTaggingContainer = tags;
    }

    static storeRemotePlayerTags(remoteTags: TagsObject): void {
        assertObjectValuesType(remoteTags, "number");
        OneSignal.context.tagManager.remoteTags = remoteTags;
    }

    /**
     * - Returns an object with only the tags that should be updated
     * - Used when is in update mode (not first subscribe)
     * @param  {TagsObject} localTags - from tagging container (type "number" values)
     * @param  {TagsObject} remoteTags - from remote player record (type "number" values)
     * @returns TagsObject
     */
    static getTagsToUpdate(localTags: TagsObject, remoteTags: TagsObject): TagsObject {
        const diff = TagUtils.getObjectDifference(localTags, remoteTags);
        return TagUtils.getOnlyKeysObject(diff, localTags);
    }
}
