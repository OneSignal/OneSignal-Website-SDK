import Log from '../../../libraries/Log';
import { TagsObjectForApi, TagsObjectWithBoolean } from '../../../models/Tags';
import TagUtils from '../../../utils/TagUtils';
import { ContextInterface } from '../../../models/Context';
import { ITagManager } from '../types';

/**
 * Manages tags for the TaggingContainer
 */
export default class TagManager implements ITagManager {
    // local tags from tagging container
    private tagsFromTaggingContainer: TagsObjectWithBoolean = {};
    private context: ContextInterface;
    public remoteTags: TagsObjectForApi = {};

    constructor(context: ContextInterface) {
        this.context = context;
    }

    /**
     * @param  {boolean} isInUpdateMode
     * @returns Promise resolving TagsObject if successful, {} if no change detected, null if failed
     */
    public async sendTags(_isInUpdateMode: boolean): Promise<TagsObjectForApi> {
        Log.info("Category Slidedown Local Tags:", this.tagsFromTaggingContainer);

        const localTagsConvertedToApi = TagUtils.convertTagsBooleansToApi(this.tagsFromTaggingContainer);
        const finalTagsObject = TagUtils.getObjectDifference(localTagsConvertedToApi, this.remoteTags);

        const shouldSendUpdate = !TagUtils.isTagObjectEmpty(finalTagsObject);
        if (shouldSendUpdate) {
            return await OneSignal.sendTags(finalTagsObject) as TagsObjectForApi;
        }
        Log.warn("OneSignal: no change detected in Category preferences. Abort tag update.");
        // no change detected, return {}
        return finalTagsObject;
    }
    /**
     * @param  {TagsObject} tags - values of type "boolean"
     * @returns void
     */
    storeTagValuesToUpdate(tags: TagsObjectWithBoolean): void {
        this.tagsFromTaggingContainer = tags;
    }
    /**
     * @param  {TagsObject} remoteTags - values of type "number"
     * @returns void
     */
    storeRemotePlayerTags(remoteTags: TagsObjectForApi): void {
        this.context.tagManager.remoteTags = remoteTags;
    }
}
