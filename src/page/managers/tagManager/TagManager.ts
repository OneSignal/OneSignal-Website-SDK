import Log from '../../../shared/libraries/Log';
import TagUtils from '../../../shared/utils/TagUtils';
import type { ContextInterface } from '../../models/Context';
import type {
  TagsObjectForApi,
  TagsObjectWithBoolean,
} from '../../models/Tags';
import type { ITagManager } from './types';

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
   * @returns Promise resolving TagsObject if successful, {} if no change detected, null if failed
   */
  public async sendTags(): Promise<TagsObjectForApi> {
    Log.info('Category Slidedown Local Tags:', this.tagsFromTaggingContainer);

    const localTagsConvertedToApi = TagUtils.convertTagsBooleansToApi(
      this.tagsFromTaggingContainer,
    );
    const finalTagsObject = TagUtils.getObjectDifference(
      localTagsConvertedToApi,
      this.remoteTags,
    );

    const shouldSendUpdate = !TagUtils.isTagObjectEmpty(finalTagsObject);
    if (shouldSendUpdate) {
      await OneSignal.User.addTags(finalTagsObject);
      return finalTagsObject;
    }
    Log.warn(
      'OneSignal: no change detected in Category preferences. Skipping tag update.',
    );
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
