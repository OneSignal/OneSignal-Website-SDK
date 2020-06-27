import { TagsObject } from '../../models/Tags';

export interface ITagManager {
    sendTags: () => Promise<TagsObject|null>;
    storeTagValuesToUpdate: (tags: TagsObject) => void;
}
