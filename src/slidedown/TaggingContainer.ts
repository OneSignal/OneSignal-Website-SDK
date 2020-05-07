import TagCategory from '../models/TagCategory';
import { addDomElement } from '../utils';

export default class TaggingContainer {
    private html: string;

    constructor(remoteTagCategories: Array<TagCategory>, existingPlayerTags?: Object){
        const checkedTagCategories = !!existingPlayerTags ?
            remoteTagCategories.map(elem => {
                elem.checked = Object.keys(existingPlayerTags).indexOf(elem.tag) !== -1 ? true : false;
                return elem;
            })
            : remoteTagCategories;
        let innerHtml;
        for (let i=0; i<checkedTagCategories.length; i++) {
            if (i===0) {
                innerHtml = `<div class="tagging-container-col">`;
            }
            if (i===5) {
                innerHtml += `</div><div class="tagging-container-col">`;
            }
            innerHtml+=this.getCategoryLabelHtml(checkedTagCategories[i]);
        }
        innerHtml+="</div>";

        this.html = `<div class="tagging-container">${innerHtml}</div>`;
    }

    public mount(): void {
        addDomElement('#slidedown-body', 'beforeend', this.html);
    }

    private getCategoryLabelHtml(tagCategory: TagCategory): string {
        const isChecked = tagCategory.checked ? 'checked' : '';
        const label = tagCategory.label.length >= 19 ? `${tagCategory.label.slice(0,19)}...` : tagCategory.label;
        return `<label class="onesignal-category-label">${label}
        <input type="checkbox" value="${tagCategory.tag}" ${isChecked}>
        <span class="onesignal-checkmark"></span></label>`;
    }
}
