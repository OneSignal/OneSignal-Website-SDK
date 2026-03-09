function resolveElement(target: Element | string): Element {
  if (typeof target === 'string') {
    const el = document.querySelector(target);
    if (!el) throw new Error(`Cannot find element with selector "${target}"`);
    return el;
  }
  return target;
}

export function addDomElement(
  targetSelectorOrElement: string | Element,
  addOrder: InsertPosition,
  elementHtml: string,
) {
  resolveElement(targetSelectorOrElement).insertAdjacentHTML(
    addOrder,
    elementHtml,
  );
}

export function removeDomElement(selector: string) {
  for (const el of document.querySelectorAll(selector)) {
    el.remove();
  }
}

export function clearDomElementChildren(target: Element | string) {
  resolveElement(target).replaceChildren();
}

export function getDomElementOrStub(selector: string): Element {
  return document.querySelector(selector) ?? document.createElement('div');
}

export function addCssClass(target: Element | string, cssClass: string) {
  resolveElement(target).classList.add(cssClass);
}

export function removeCssClass(target: Element | string, cssClass: string) {
  resolveElement(target).classList.remove(cssClass);
}

export function decodeHtmlEntities(text: string): string {
  if (typeof DOMParser === 'undefined') {
    return text;
  }
  const doc = new DOMParser().parseFromString(text, 'text/html');
  return doc.documentElement.textContent || '';
}
