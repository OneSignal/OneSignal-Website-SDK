import { TagsObject } from '../../models/Tags';

export interface ITagManager {
    sendTags: (isInUpdateMode: boolean) => Promise<TagsObject|null>;
    storeTagValuesToUpdate: (tags: TagsObject) => void;
    playerTags: TagsObject;
}
