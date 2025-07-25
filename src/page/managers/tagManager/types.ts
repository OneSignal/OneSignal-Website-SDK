import type { TagsObjectForApi, TagsObjectWithBoolean } from 'src/page/tags';

export interface ITagManager {
  sendTags: (isInUpdateMode?: boolean) => Promise<TagsObjectForApi | null>;
  storeTagValuesToUpdate: (tags: TagsObjectWithBoolean) => void;
  storeRemotePlayerTags: (tags: TagsObjectForApi) => void;
  remoteTags: TagsObjectForApi;
}
