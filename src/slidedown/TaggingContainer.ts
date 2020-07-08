import { TagCategory, TagsObject } from '../models/Tags';
import {
    addDomElement,
    removeDomElement,
    addCssClass,
    removeCssClass,
    getDomElementOrStub,
    getAllDomElementsOrStub } from '../utils';
import getLoadingIndicatorWithColor from './LoadingIndicator';
import Slidedown from './Slidedown';

export default class TaggingContainer {
    private html: string = "";

    /* styles */
    public static readonly onesignalCategoryLabelInputClass = "onesignal-category-label-input";
    public static readonly onesignalCategoryLabelTextClass = "onesignal-category-label-text";
    public static readonly onesignalCategoryLabelClass = "onesignal-category-label";
    public static readonly onesignalCheckmarkClass = "onesignal-checkmark";
    public static readonly taggingContainerClass = "tagging-container";
    public static readonly taggingContainerColClass = "tagging-container-col";
    public static readonly onesignalLoadingContainerClass = "onesignal-loading-container";
    public static readonly onesignalLoadingMessageClass = "onesignal-loading-message";

    /* for testing only */
    public TESTING = {
        getCheckedTagCategories: this._getCheckedTagCategories
    };
    /* for testing only */

    public mount(remoteTagCategories: Array<TagCategory>, existingPlayerTags?: TagsObject): void {
        this.generateHTML(remoteTagCategories, existingPlayerTags);
        addDomElement(`#${Slidedown.slidedownBodyClass}`, 'beforeend', this.html);
        if (this.taggingContainer) {
            this.taggingContainer.addEventListener('change', this.toggleCheckedTag);
        }
        removeCssClass(`#${Slidedown.onesignalSlidedownAllowButtonClass}`, 'disabled');
        const allowButton = getDomElementOrStub(`#${Slidedown.onesignalSlidedownAllowButtonClass}`);
        (<HTMLButtonElement>allowButton).disabled = false;
        removeDomElement(`#${TaggingContainer.onesignalLoadingContainerClass}`);
    }

    public load(): void {
        addCssClass(`#${TaggingContainer.onesignalLoadingContainerClass}`,
            `${TaggingContainer.onesignalLoadingContainerClass}`);
        addDomElement(`#${TaggingContainer.onesignalLoadingContainerClass}`,
            'beforeend', getLoadingIndicatorWithColor('#95A1AC'));
        addDomElement(`#${TaggingContainer.onesignalLoadingContainerClass}`, 'beforeend',
            `<div class="${TaggingContainer.onesignalLoadingMessageClass}">Fetching your preferences</div>`);

        const allowButton = getDomElementOrStub(`#${Slidedown.onesignalSlidedownAllowButtonClass}`);
        (<HTMLButtonElement>allowButton).disabled = true;

        addCssClass(`#${Slidedown.onesignalSlidedownAllowButtonClass}`, 'disabled');
    }

    /**
     * Returns checked TagCategory[] using unchecked remoteTagCategories (from config)
     * and existingPlayerTags (from `getTags`)
     * @param  {TagCategory[]} remoteTagCategories
     * @param  {TagsObject} existingPlayerTags?
     */
    private _getCheckedTagCategories(remoteTagCategories: TagCategory[], existingPlayerTags?: TagsObject)
        : TagCategory[] {
            const remoteTagCategoriesCopy: TagCategory[] = JSON.parse(JSON.stringify(remoteTagCategories));
            return !!existingPlayerTags ?
                remoteTagCategoriesCopy.map(elem => {
                    const existingTagValue = <boolean>existingPlayerTags[elem.tag];
                    elem.checked = existingTagValue;
                    return elem;
                }) : remoteTagCategories;
    }

    private generateHTML(remoteTagCategories: TagCategory[], existingPlayerTags?: TagsObject): void {
        const checkedTagCategories = this._getCheckedTagCategories(remoteTagCategories, existingPlayerTags);
        const firstColumnArr = checkedTagCategories.filter(elem => checkedTagCategories.indexOf(elem) % 2 === 0);
        const secondColumnArr = checkedTagCategories.filter(elem => checkedTagCategories.indexOf(elem) % 2);
        let innerHtml = `<div class="${TaggingContainer.taggingContainerColClass}">`;

        firstColumnArr.forEach(elem => {
            innerHtml+=this.getCategoryLabelHtml(elem);
        });

        innerHtml+=`</div><div class="${TaggingContainer.taggingContainerColClass}">`;

        secondColumnArr.forEach(elem => {
            innerHtml+=this.getCategoryLabelHtml(elem);
        });

        this.html = `<div class="${TaggingContainer.taggingContainerClass}">${innerHtml}</div></div>`;
    }

    private getCategoryLabelHtml(tagCategory: TagCategory): string {
        const { label } = tagCategory;
        return `<label class="${TaggingContainer.onesignalCategoryLabelClass}" title="${(label)}">` +
        `<span class="${TaggingContainer.onesignalCategoryLabelTextClass}">${label}</span>` +
        `<input class="${TaggingContainer.onesignalCategoryLabelInputClass}" type="checkbox"` +
        `value="${tagCategory.tag}" ${tagCategory.checked ? `checked="${`${tagCategory.checked}`}"` : ''}>` +
        `<span class="${TaggingContainer.onesignalCheckmarkClass}"></span></label>` +
        `<div style="clear:both"></div>`;
    }

    private get taggingContainer(){
        return getDomElementOrStub(`#${Slidedown.slidedownBodyClass} > div.${TaggingContainer.taggingContainerClass}`);
    }

    private toggleCheckedTag(e: Event) {
        const target = (<HTMLInputElement>e.target);
        if (target && target.getAttribute("type") === "checkbox") {
            const isChecked = target.checked;
            target.setAttribute("checked", isChecked.toString());
        }
    }

    // static

    static getValuesFromTaggingContainer(): TagsObject {
        const selector = `#${Slidedown.slidedownBodyClass} > div.${TaggingContainer.taggingContainerClass}` +
            `> div > label > input[type=checkbox]`;
        const inputNodeArr = getAllDomElementsOrStub(selector);
        const tags: TagsObject = {};
        inputNodeArr.forEach(node => {
            tags[(<HTMLInputElement>node).defaultValue] = (<HTMLInputElement>node).checked;
        });
        return tags;
    }
}
