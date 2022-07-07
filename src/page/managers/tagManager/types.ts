import { TagsObjectForApi, TagsObjectWithBoolean } from '../../models/Tags';

export interface ITagManager {
    sendTags: (isInUpdateMode: boolean) => Promise<TagsObjectForApi | null>;
    storeTagValuesToUpdate: (tags: TagsObjectWithBoolean) => void;
    storeRemotePlayerTags: (tags: TagsObjectForApi) => void;
    remoteTags: TagsObjectForApi;
}
