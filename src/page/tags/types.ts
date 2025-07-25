import type { TagCategory } from 'src/shared/prompts';

type PossibleTagValueValues = '0' | '1';
export interface TagsObject<T> {
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
