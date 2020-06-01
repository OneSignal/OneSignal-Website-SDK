export interface TagCategory {
    tag: string;
    label: string;
    checked?: boolean;
}

export interface TagsObject {
    [key:string]: string|boolean|number;
}
