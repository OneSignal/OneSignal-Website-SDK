import {
  COLORS,
  SLIDEDOWN_CSS_CLASSES,
  SLIDEDOWN_CSS_IDS,
  TAGGING_CONTAINER_CSS_CLASSES,
  TAGGING_CONTAINER_CSS_IDS,
  TAGGING_CONTAINER_STRINGS,
} from '../../shared/slidedown/constants';
import TagUtils from '../../shared/utils/TagUtils';
import {
  addCssClass,
  addDomElement,
  getDomElementOrStub,
  removeCssClass,
  removeDomElement,
} from '../../shared/utils/utils';
import type { TagCategory, TagsObjectWithBoolean } from '../models/Tags';
import { getLoadingIndicatorWithColor } from './LoadingIndicator';

export default class TaggingContainer {
  public mount(
    remoteTagCategories: Array<TagCategory>,
    existingPlayerTags?: TagsObjectWithBoolean,
  ): void {
    const taggingContainer = this.generateHtml(
      remoteTagCategories,
      existingPlayerTags,
    );

    const body = getDomElementOrStub(`#${SLIDEDOWN_CSS_IDS.body}`);
    body.appendChild(taggingContainer);

    if (this.taggingContainer) {
      this.taggingContainer.addEventListener('change', this.toggleCheckedTag);
    }

    const allowButton = getDomElementOrStub(
      `#${SLIDEDOWN_CSS_IDS.allowButton}`,
    ) as HTMLButtonElement;
    allowButton.disabled = false;

    removeCssClass(allowButton, 'disabled');
    removeDomElement(`#${SLIDEDOWN_CSS_IDS.loadingContainer}`);
  }

  /**
   * No longer used as of user model changes, but may be useful in the future
   */
  public load(): void {
    const loadingContainer = getDomElementOrStub(
      `#${SLIDEDOWN_CSS_IDS.loadingContainer}`,
    );
    const allowButton = getDomElementOrStub(
      `#${SLIDEDOWN_CSS_IDS.allowButton}`,
    ) as HTMLButtonElement;
    const loadingMessageContainer = document.createElement('div');

    addCssClass(loadingContainer, `${SLIDEDOWN_CSS_CLASSES.loadingContainer}`);
    addCssClass(
      loadingMessageContainer,
      TAGGING_CONTAINER_CSS_CLASSES.loadingMessage,
    );
    addCssClass(allowButton, 'disabled');

    addDomElement(
      loadingContainer,
      'beforeend',
      getLoadingIndicatorWithColor(COLORS.greyLoadingIndicator),
    );

    loadingMessageContainer.innerText =
      TAGGING_CONTAINER_STRINGS.fetchingPreferences;
    loadingContainer.appendChild(loadingMessageContainer);
    allowButton.disabled = true;
  }

  private generateHtml(
    remoteTagCategories: TagCategory[],
    existingPlayerTags?: TagsObjectWithBoolean,
  ): Element {
    const checkedTagCategories = TagUtils.getCheckedTagCategories(
      remoteTagCategories,
      existingPlayerTags,
    );

    const firstColumnArr = checkedTagCategories.filter(
      (elem) => checkedTagCategories.indexOf(elem) % 2 === 0,
    );
    const secondColumnArr = checkedTagCategories.filter(
      (elem) => checkedTagCategories.indexOf(elem) % 2,
    );

    const firstColumnContainer = document.createElement('div');
    const secondColumnContainer = document.createElement('div');
    const taggingContainer = document.createElement('div');

    addCssClass(
      firstColumnContainer,
      TAGGING_CONTAINER_CSS_CLASSES.taggingContainerCol,
    );
    addCssClass(
      secondColumnContainer,
      TAGGING_CONTAINER_CSS_CLASSES.taggingContainerCol,
    );
    addCssClass(
      taggingContainer,
      TAGGING_CONTAINER_CSS_CLASSES.taggingContainer,
    );

    taggingContainer.id = TAGGING_CONTAINER_CSS_IDS.taggingContainer;

    firstColumnArr.forEach((elem) => {
      firstColumnContainer.appendChild(this.getCategoryLabelElement(elem));
    });

    secondColumnArr.forEach((elem) => {
      secondColumnContainer.appendChild(this.getCategoryLabelElement(elem));
    });

    taggingContainer.appendChild(firstColumnContainer);
    taggingContainer.appendChild(secondColumnContainer);

    return taggingContainer;
  }

  private getCategoryLabelElement(tagCategory: TagCategory): Element {
    const { label } = tagCategory;

    const labelElement = document.createElement('label');
    const labelSpan = document.createElement('span');
    const inputElement = document.createElement('input');
    const checkmarkSpan = document.createElement('span');
    const clear = document.createElement('div');
    const wrappingDiv = document.createElement('div');

    addCssClass(labelElement, TAGGING_CONTAINER_CSS_CLASSES.categoryLabel);
    addCssClass(labelSpan, TAGGING_CONTAINER_CSS_CLASSES.categoryLabelText);
    addCssClass(inputElement, TAGGING_CONTAINER_CSS_CLASSES.categoryLabelInput);
    addCssClass(checkmarkSpan, TAGGING_CONTAINER_CSS_CLASSES.checkmark);

    labelElement.title = label;
    labelSpan.innerText = label;
    inputElement.type = 'checkbox';
    inputElement.value = tagCategory.tag;
    inputElement.checked = !!tagCategory.checked;

    labelElement.appendChild(labelSpan);
    labelElement.appendChild(inputElement);
    labelElement.appendChild(checkmarkSpan);

    clear.setAttribute('style', 'clear:both');

    wrappingDiv.appendChild(labelElement);
    wrappingDiv.appendChild(clear);

    return wrappingDiv;
  }

  private get taggingContainer(): Element {
    const selector = `#${SLIDEDOWN_CSS_IDS.body} > div.${TAGGING_CONTAINER_CSS_CLASSES.taggingContainer}`;
    return getDomElementOrStub(selector);
  }

  private toggleCheckedTag(e: Event): void {
    const target = e.target as HTMLInputElement;

    if (target && target.getAttribute('type') === 'checkbox') {
      const isChecked = target.checked;
      target.setAttribute('checked', isChecked.toString());
    }
  }

  static getValuesFromTaggingContainer(): TagsObjectWithBoolean {
    const selector =
      `#${SLIDEDOWN_CSS_IDS.body} > div.${TAGGING_CONTAINER_CSS_CLASSES.taggingContainer}` +
      `> div > div > label > input[type=checkbox]`;
    const inputNodeArr = document.querySelectorAll(selector);
    const tags: TagsObjectWithBoolean = {};

    inputNodeArr.forEach((node) => {
      tags[(node as HTMLInputElement).value] = (
        node as HTMLInputElement
      ).checked;
    });
    return tags;
  }
}
