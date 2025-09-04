import type {
  TagsObjectForApi,
  TagsObjectWithBoolean,
} from 'src/page/tags/types';
import type { ContextInterface } from 'src/shared/context/types';
import Log from '../../../shared/libraries/Log';
import TagUtils from '../../../shared/utils/TagUtils';
import type { ITagManager } from './types';

/**
 * Manages tags for the TaggingContainer
 */
export default class TagManager implements ITagManager {
  // local tags from tagging container
  private _tagsFromTaggingContainer: TagsObjectWithBoolean = {};
  private _context: ContextInterface;
  public _remoteTags: TagsObjectForApi = {};

  constructor(context: ContextInterface) {
    this._context = context;
  }

  /**
   * @returns Promise resolving TagsObject if successful, {} if no change detected, null if failed
   */
  public async _sendTags(): Promise<TagsObjectForApi> {
    Log._info('Category Slidedown Local Tags:', this._tagsFromTaggingContainer);

    const localTagsConvertedToApi = TagUtils.convertTagsBooleansToApi(
      this._tagsFromTaggingContainer,
    );
    const finalTagsObject = TagUtils.getObjectDifference(
      localTagsConvertedToApi,
      this._remoteTags,
    );

    const shouldSendUpdate = !TagUtils.isTagObjectEmpty(finalTagsObject);
    if (shouldSendUpdate) {
      await OneSignal.User.addTags(finalTagsObject);
      return finalTagsObject;
    }
    Log._warn(
      'OneSignal: no change detected in Category preferences. Skipping tag update.',
    );
    // no change detected, return {}
    return finalTagsObject;
  }

  /**
   * @param  {TagsObject} tags - values of type "boolean"
   * @returns void
   */
  _storeTagValuesToUpdate(tags: TagsObjectWithBoolean): void {
    this._tagsFromTaggingContainer = tags;
  }

  /**
   * @param  {TagsObject} remoteTags - values of type "number"
   * @returns void
   */
  _storeRemotePlayerTags(remoteTags: TagsObjectForApi): void {
    this._context._tagManager._remoteTags = remoteTags;
  }
}
