import type { TagsObjectForApi, TagsObjectWithBoolean } from 'src/page/tags/types';

export interface ITagManager {
  _sendTags: (isInUpdateMode?: boolean) => TagsObjectForApi | null;
  _storeTagValuesToUpdate: (tags: TagsObjectWithBoolean) => void;
  _storeRemotePlayerTags: (tags: TagsObjectForApi) => void;
  _remoteTags: TagsObjectForApi;
}
