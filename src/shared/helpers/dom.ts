import Log from 'src/shared/libraries/Log';

export function addDomElement(
  targetSelectorOrElement: string | Element,
  addOrder: InsertPosition,
  elementHtml: string,
) {
  let targetElement: Element | null;
  if (typeof targetSelectorOrElement === 'string') {
    targetElement = document.querySelector(targetSelectorOrElement);
  } else {
    targetElement = targetSelectorOrElement;
  }

  if (targetElement) {
    targetElement.insertAdjacentHTML(addOrder, elementHtml);
    return;
  }
  throw new Error(
    `${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`,
  );
}

export function removeDomElement(selector: string) {
  const els = document.querySelectorAll(selector);
  if (els.length > 0) {
    for (let i = 0; i < els.length; i++) {
      const parentNode = els[i].parentNode;
      if (parentNode) {
        parentNode.removeChild(els[i]);
      }
    }
  }
}

export function clearDomElementChildren(
  targetSelectorOrElement: Element | string,
) {
  if (typeof targetSelectorOrElement === 'string') {
    const element = document.querySelector(targetSelectorOrElement);
    if (element === null) {
      throw new Error(
        `Cannot find element with selector "${targetSelectorOrElement}"`,
      );
    }
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  } else if (typeof targetSelectorOrElement === 'object') {
    while (targetSelectorOrElement.firstChild) {
      targetSelectorOrElement.removeChild(targetSelectorOrElement.firstChild);
    }
  } else
    throw new Error(
      `${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`,
    );
}

export function getDomElementOrStub(selector: string): Element {
  const foundElement = document.querySelector(selector);
  if (!foundElement) {
    Log.debug(`No instance of ${selector} found. Returning stub.`);
    return document.createElement('div');
  }
  return foundElement;
}

export function addCssClass(
  targetSelectorOrElement: Element | string,
  cssClass: string,
) {
  if (typeof targetSelectorOrElement === 'string') {
    const element = document.querySelector(targetSelectorOrElement);
    if (element === null) {
      throw new Error(
        `Cannot find element with selector "${targetSelectorOrElement}"`,
      );
    }
    element.classList.add(cssClass);
  } else if (typeof targetSelectorOrElement === 'object') {
    targetSelectorOrElement.classList.add(cssClass);
  } else {
    throw new Error(
      `${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`,
    );
  }
}

export function removeCssClass(
  targetSelectorOrElement: Element | string,
  cssClass: string,
) {
  if (typeof targetSelectorOrElement === 'string') {
    const element = document.querySelector(targetSelectorOrElement);
    if (element === null) {
      throw new Error(
        `Cannot find element with selector "${targetSelectorOrElement}"`,
      );
    }
    element.classList.remove(cssClass);
  } else if (typeof targetSelectorOrElement === 'object') {
    targetSelectorOrElement.classList.remove(cssClass);
  } else {
    throw new Error(
      `${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`,
    );
  }
}

export function hasCssClass(
  targetSelectorOrElement: Element | string,
  cssClass: string,
) {
  if (typeof targetSelectorOrElement === 'string') {
    const element = document.querySelector(targetSelectorOrElement);
    if (element === null) {
      throw new Error(
        `Cannot find element with selector "${targetSelectorOrElement}"`,
      );
    }
    return element.classList.contains(cssClass);
  } else if (typeof targetSelectorOrElement === 'object') {
    return targetSelectorOrElement.classList.contains(cssClass);
  } else {
    throw new Error(
      `${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`,
    );
  }
}

export function decodeHtmlEntities(text: string): string {
  if (typeof DOMParser === 'undefined') {
    return text;
  }
  const doc = new DOMParser().parseFromString(text, 'text/html');
  return doc.documentElement.textContent || '';
}
