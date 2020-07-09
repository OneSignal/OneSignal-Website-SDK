export interface TagCategory {
    tag: string;
    label: string;
    checked?: boolean;
}
type PossibleTagValueValues = "0" | "1";
interface TagsObject<T> {
    [key: string]: T;
}
export type TagsObjectWithBoolean = TagsObject<boolean>;
export type TagsObjectForApi = TagsObject<PossibleTagValueValues>;

export interface Categories {
    positiveUpdateButton: string;
    negativeUpdateButton: string;
    savingButtonText: string;
    errorButtonText: string;
    updateMessage: string;
    tags: TagCategory[];
}
