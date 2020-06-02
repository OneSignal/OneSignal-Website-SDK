import { TagCategory, TagsObject } from '../models/Tags';
import { addDomElement, removeDomElement, addCssClass, removeCssClass, getDomElementOrStub, getAllDomElementsOrStub } from '../utils';
import getLoadingIndicatorWithColor from './LoadingIndicator';

export default class TaggingContainer {
    private html: string = "";

    public mount(remoteTagCategories: Array<TagCategory>, existingPlayerTags?: TagsObject): void {
        this.generateHTML(remoteTagCategories, existingPlayerTags);
        addDomElement('#slidedown-body', 'beforeend', this.html);
        if (this.taggingContainer) {
            this.taggingContainer.addEventListener('change', this.toggleCheckedTag);
        }
        removeCssClass("#onesignal-slidedown-allow-button", 'disabled');
        const allowButton = getDomElementOrStub("#onesignal-slidedown-allow-button");
        (<HTMLButtonElement>allowButton).disabled = false;
        removeDomElement("#onesignal-loading-container");
    }

    public load(): void {
        addCssClass("#onesignal-loading-container", 'onesignal-loading-container');
        addDomElement("#onesignal-loading-container", 'beforeend', getLoadingIndicatorWithColor('#95A1AC'));
        addDomElement("#onesignal-loading-container", 'beforeend',
            `<div class="onesignal-loading-message">Fetching your preferences</div>`);
        const allowButton = getDomElementOrStub("#onesignal-slidedown-allow-button");
        (<HTMLButtonElement>allowButton).disabled = true;
        addCssClass("#onesignal-slidedown-allow-button", 'disabled');
    }

    private generateHTML(remoteTagCategories: Array<TagCategory>, existingPlayerTags?: TagsObject): void {
        const checkedTagCategories = !!existingPlayerTags ?
            remoteTagCategories.map(elem => {
                const existingTagValue = <boolean>existingPlayerTags[elem.tag];
                elem.checked = existingTagValue;
                return elem;
            })
            : remoteTagCategories;
        const firstColumnArr = checkedTagCategories.filter(elem => checkedTagCategories.indexOf(elem) % 2 === 0);
        const secondColumnArr = checkedTagCategories.filter(elem => checkedTagCategories.indexOf(elem) % 2);
        let innerHtml = `<div class="tagging-container-col">`;

        for (const elem of firstColumnArr) {
            innerHtml+=this.getCategoryLabelHtml(elem);
        }

        innerHtml+=`</div><div class="tagging-container-col">`;

        for (const elem of secondColumnArr) {
            innerHtml+=this.getCategoryLabelHtml(elem);
        }

        this.html = `<div class="tagging-container">${innerHtml}</div></div>`;
    }

    private getCategoryLabelHtml(tagCategory: TagCategory): string {
        const { label } = tagCategory;
        return `<label class="onesignal-category-label" title="${label}">
        <span class="onesignal-category-label-text">${label}</span>
        <input type="checkbox" value="${tagCategory.tag}"
            ${tagCategory.checked ? `checked="${tagCategory.checked}` : ``}">
        <span class="onesignal-checkmark"></span></label>`;
    }

    private get taggingContainer(){
        return getDomElementOrStub("#slidedown-body > div.tagging-container");
    }

    private toggleCheckedTag(e: Event) {
        if (e.srcElement && e.srcElement.getAttribute("type") === "checkbox") {
            const isChecked = (<HTMLInputElement>e.srcElement).checked;
            e.srcElement.setAttribute("checked", isChecked.toString());
        }
    }

    static getValuesFromTaggingContainer(): TagsObject {
        const selector = "#slidedown-body > div.tagging-container > div > label > input[type=checkbox]";
        const inputNodeArr = getAllDomElementsOrStub(selector);
        const tags: TagsObject = {};
        inputNodeArr.forEach(node => {
            tags[(<HTMLInputElement>node).defaultValue] = (<HTMLInputElement>node).checked;
        });
        return tags;
    }
}
