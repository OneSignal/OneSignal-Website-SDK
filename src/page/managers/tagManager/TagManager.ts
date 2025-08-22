import type {
  TagsObjectForApi,
  TagsObjectWithBoolean,
} from 'src/page/tags/types';
import type { ContextInterface } from 'src/shared/context/types';
import log from '../../../shared/helpers/log';
import { MessageTypePage } from '../../../shared/helpers/log/constants';
import TagUtils from '../../../shared/utils/TagUtils';
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
    log(MessageTypePage.TagManagerLocalTags, {
      tags: this.tagsFromTaggingContainer,
    });

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
    log(MessageTypePage.TagManagerError);
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
