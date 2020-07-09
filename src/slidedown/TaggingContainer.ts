import { TagCategory, TagsObjectWithBoolean } from '../models/Tags';
import {
    addDomElement,
    removeDomElement,
    addCssClass,
    removeCssClass,
    getDomElementOrStub
} from '../utils';
import { getLoadingIndicatorWithColor } from './LoadingIndicator';
import TagUtils from '../utils/TagUtils';
import { SlidedownCssIds, TaggingContainerCssClasses, TaggingContainerCssIds } from './constants';

export default class TaggingContainer {
    private html: string = "";

    public mount(remoteTagCategories: Array<TagCategory>, existingPlayerTags?: TagsObjectWithBoolean): void {
        this.html = this.generateHtml(remoteTagCategories, existingPlayerTags);

        const body = getDomElementOrStub(`#${SlidedownCssIds.body}`);
        addDomElement(body, 'beforeend', this.html);

        if (this.taggingContainer) {
            // TODO: is there unmount and remove this listener?
            this.taggingContainer.addEventListener('change', this.toggleCheckedTag);
        }

        const allowButton = getDomElementOrStub(`#${SlidedownCssIds.allowButton}`) as HTMLButtonElement;
        allowButton.disabled = false;
        removeCssClass(allowButton, 'disabled');

        removeDomElement(`#${TaggingContainerCssClasses.loadingContainer}`);
    }

    public load(): void {
        const loadingContainer = getDomElementOrStub(`#${TaggingContainerCssIds.loadingContainer}`);
        addCssClass(loadingContainer, `${TaggingContainerCssClasses.loadingContainer}`);
        addDomElement(loadingContainer, 'beforeend', getLoadingIndicatorWithColor('#95A1AC'));
        addDomElement(loadingContainer, 'beforeend',
            `<div class="${TaggingContainerCssClasses.loadingMessage}">Fetching your preferences</div>`);

        const allowButton = getDomElementOrStub(`#${SlidedownCssIds.allowButton}`) as HTMLButtonElement;
        allowButton.disabled = true;
        addCssClass(allowButton, 'disabled');
    }

    private generateHtml(remoteTagCategories: TagCategory[], existingPlayerTags?: TagsObjectWithBoolean): string {
        const checkedTagCategories = TagUtils.getCheckedTagCategories(remoteTagCategories, existingPlayerTags);
        const firstColumnArr = checkedTagCategories.filter(elem => checkedTagCategories.indexOf(elem) % 2 === 0);
        const secondColumnArr = checkedTagCategories.filter(elem => checkedTagCategories.indexOf(elem) % 2);

        let innerHtml = `<div class="${TaggingContainerCssClasses.taggingContainerCol}">`;
        firstColumnArr.forEach(elem => {
            innerHtml += this.getCategoryLabelHtml(elem);
        });
        innerHtml += "</div>";

        innerHtml += `<div class="${TaggingContainerCssClasses.taggingContainerCol}">`;
        secondColumnArr.forEach(elem => {
            innerHtml += this.getCategoryLabelHtml(elem);
        });
        innerHtml += "</div>";

        return `<div class="${TaggingContainerCssClasses.taggingContainer}">${innerHtml}</div>`;
    }

    private getCategoryLabelHtml(tagCategory: TagCategory): string {
        const { label } = tagCategory;
        return `
            <label class="${TaggingContainerCssClasses.categoryLabel}" title="${(label)}">
                <span class="${TaggingContainerCssClasses.categoryLabelText}">${label}</span>
                <input class="${TaggingContainerCssClasses.categoryLabelInput}"
                    type="checkbox"
                    value="${tagCategory.tag}"
                    ${tagCategory.checked ? `checked="${`${tagCategory.checked}`}"` : ''}
                />
                <span class="${TaggingContainerCssClasses.checkmark}" />
            </label>
            <div style="clear:both" />`;
    }

    private get taggingContainer(): Element {
        return getDomElementOrStub(`#${SlidedownCssIds.body} > div.${TaggingContainerCssClasses.taggingContainer}`);
    }

    private toggleCheckedTag(e: Event): void {
        const target = (<HTMLInputElement>e.target);
        if (target && target.getAttribute("type") === "checkbox") {
            const isChecked = target.checked;
            target.setAttribute("checked", isChecked.toString());
        }
    }

    static getValuesFromTaggingContainer(): TagsObjectWithBoolean {
        const selector = `#${SlidedownCssIds.body} > div.${TaggingContainerCssClasses.taggingContainer}` +
            `> div > label > input[type=checkbox]`;
        const inputNodeArr = document.querySelectorAll(selector);
        const tags: TagsObjectWithBoolean = {};
        inputNodeArr.forEach(node => {
            tags[(<HTMLInputElement>node).defaultValue] = (<HTMLInputElement>node).checked;
        });
        return tags;
    }
}
