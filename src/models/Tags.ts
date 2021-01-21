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

// deprecating in config schema version 2+
export interface Categories {
    positiveUpdateButton: string;
    negativeUpdateButton: string;
    savingButton: string;
    errorButton: string;
    updateMessage: string;
    tags: TagCategory[];
}
