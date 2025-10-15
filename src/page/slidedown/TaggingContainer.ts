import type { TagCategory } from 'src/page/tags/types';
import {
  addCssClass,
  addDomElement,
  getDomElementOrStub,
  removeCssClass,
  removeDomElement,
} from 'src/shared/helpers/dom';
import { getCheckedTagCategories } from 'src/shared/utils/tags';
import {
  COLORS,
  SLIDEDOWN_CSS_CLASSES,
  SLIDEDOWN_CSS_IDS,
  TAGGING_CONTAINER_CSS_CLASSES,
  TAGGING_CONTAINER_CSS_IDS,
  TAGGING_CONTAINER_STRINGS,
} from '../../shared/slidedown/constants';
import type { TagsObjectWithBoolean } from '../tags/types';
import { getLoadingIndicatorWithColor } from './LoadingIndicator';

export default class TaggingContainer {
  public _mount(
    remoteTagCategories: Array<TagCategory>,
    existingPlayerTags?: TagsObjectWithBoolean,
  ): void {
    const taggingContainer = this._generateHtml(
      remoteTagCategories,
      existingPlayerTags,
    );

    const body = getDomElementOrStub(`#${SLIDEDOWN_CSS_IDS._Body}`);
    body.appendChild(taggingContainer);

    if (this._taggingContainer) {
      this._taggingContainer.addEventListener('change', this._toggleCheckedTag);
    }

    const allowButton = getDomElementOrStub(
      `#${SLIDEDOWN_CSS_IDS._AllowButton}`,
    ) as HTMLButtonElement;
    allowButton.disabled = false;

    removeCssClass(allowButton, 'disabled');
    removeDomElement(`#${SLIDEDOWN_CSS_IDS._LoadingContainer}`);
  }

  /**
   * No longer used as of user model changes, but may be useful in the future
   */
  public _load(): void {
    const loadingContainer = getDomElementOrStub(
      `#${SLIDEDOWN_CSS_IDS._LoadingContainer}`,
    );
    const allowButton = getDomElementOrStub(
      `#${SLIDEDOWN_CSS_IDS._AllowButton}`,
    ) as HTMLButtonElement;
    const loadingMessageContainer = document.createElement('div');

    addCssClass(loadingContainer, `${SLIDEDOWN_CSS_CLASSES._LoadingContainer}`);
    addCssClass(
      loadingMessageContainer,
      TAGGING_CONTAINER_CSS_CLASSES._LoadingMessage,
    );
    addCssClass(allowButton, 'disabled');

    addDomElement(
      loadingContainer,
      'beforeend',
      getLoadingIndicatorWithColor(COLORS._GreyLoadingIndicator),
    );

    loadingMessageContainer.innerText =
      TAGGING_CONTAINER_STRINGS._FetchingPreferences;
    loadingContainer.appendChild(loadingMessageContainer);
    allowButton.disabled = true;
  }

  private _generateHtml(
    remoteTagCategories: TagCategory[],
    existingPlayerTags?: TagsObjectWithBoolean,
  ): Element {
    const checkedTagCategories = getCheckedTagCategories(
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
      TAGGING_CONTAINER_CSS_CLASSES._TaggingContainerCol,
    );
    addCssClass(
      secondColumnContainer,
      TAGGING_CONTAINER_CSS_CLASSES._TaggingContainerCol,
    );
    addCssClass(
      taggingContainer,
      TAGGING_CONTAINER_CSS_CLASSES._TaggingContainer,
    );

    taggingContainer.id = TAGGING_CONTAINER_CSS_IDS._TaggingContainer;

    firstColumnArr.forEach((elem) => {
      firstColumnContainer.appendChild(this._getCategoryLabelElement(elem));
    });

    secondColumnArr.forEach((elem) => {
      secondColumnContainer.appendChild(this._getCategoryLabelElement(elem));
    });

    taggingContainer.appendChild(firstColumnContainer);
    taggingContainer.appendChild(secondColumnContainer);

    return taggingContainer;
  }

  private _getCategoryLabelElement(tagCategory: TagCategory): Element {
    const { label } = tagCategory;

    const labelElement = document.createElement('label');
    const labelSpan = document.createElement('span');
    const inputElement = document.createElement('input');
    const checkmarkSpan = document.createElement('span');
    const clear = document.createElement('div');
    const wrappingDiv = document.createElement('div');

    addCssClass(labelElement, TAGGING_CONTAINER_CSS_CLASSES._CategoryLabel);
    addCssClass(labelSpan, TAGGING_CONTAINER_CSS_CLASSES._CategoryLabelText);
    addCssClass(
      inputElement,
      TAGGING_CONTAINER_CSS_CLASSES._CategoryLabelInput,
    );
    addCssClass(checkmarkSpan, TAGGING_CONTAINER_CSS_CLASSES._Checkmark);

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

  private get _taggingContainer(): Element {
    const selector = `#${SLIDEDOWN_CSS_IDS._Body} > div.${TAGGING_CONTAINER_CSS_CLASSES._TaggingContainer}`;
    return getDomElementOrStub(selector);
  }

  private _toggleCheckedTag(e: Event): void {
    const target = e.target as HTMLInputElement;

    if (target && target.getAttribute('type') === 'checkbox') {
      const isChecked = target.checked;
      target.setAttribute('checked', isChecked.toString());
    }
  }

  static _getValuesFromTaggingContainer(): TagsObjectWithBoolean {
    const selector =
      `#${SLIDEDOWN_CSS_IDS._Body} > div.${TAGGING_CONTAINER_CSS_CLASSES._TaggingContainer}` +
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
