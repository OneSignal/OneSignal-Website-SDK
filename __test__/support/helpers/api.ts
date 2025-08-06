import type { IndexableByString } from 'src/page/slidedown/types';
import { ReaderManager } from '../managers/ReaderManager';

export function isAsyncFunction(fn: () => any): boolean {
  const fnStr = fn.toString().trim();
  return !!(
    fnStr.startsWith('async ') ||
    fnStr.includes('await') ||
    fn instanceof Promise
  );
}

const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;
const ARGUMENT_NAMES = /([^\s,]+)/g;
function getParamNames(func: () => unknown): null | string[] {
  const fnStr = func.toString().replace(STRIP_COMMENTS, '');
  return fnStr
    .slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')'))
    .match(ARGUMENT_NAMES);
}

export const matchNestedProperties = (
  api: any,
  parentObject: IndexableByString<any>,
  namespaceName: string,
) => {
  const nestedProperties = api[namespaceName]?.properties;

  if (!nestedProperties) return;

  // Get the prototype of the class
  const classPrototype = Object.getPrototypeOf(parentObject[namespaceName]);

  // Check if all properties are present in the SDK
  for (const prop of nestedProperties) {
    const propertyDescriptor = Object.getOwnPropertyDescriptor(
      classPrototype,
      prop.name,
    );
    const isPropertyDefined =
      propertyDescriptor &&
      (propertyDescriptor.value !== undefined ||
        propertyDescriptor.get !== undefined);

    if (!isPropertyDefined) {
      throw new Error(
        `Property ${prop.name} for namespace ${namespaceName} not found`,
      );
    }
  }
};

export const matchNestedNamespaces = (
  api: any,
  parentObject: IndexableByString<any>,
  namespaceName: string,
) => {
  const nestedNamespaces = api[namespaceName]?.namespaces;

  if (!nestedNamespaces) return;

  // Check if all (nested) namespaces are present in the SDK
  for (const name of nestedNamespaces) {
    expect(parentObject[namespaceName][name]).toBeDefined();
  }
};

export const matchNestedFunctions = (
  api: any,
  parentObject: IndexableByString<any>,
  namespaceName: string,
) => {
  const nestedFunctions = api[namespaceName]?.functions;

  if (!nestedFunctions) return;

  // Check if all functions are present in the SDK
  for (const func of nestedFunctions) {
    const { name, isAsync, args } = func;
    expect(typeof parentObject[namespaceName][name]).toBe('function');
    expect(parentObject[namespaceName][name].length).toBe(args.length);

    const expectedArgs = getParamNames(parentObject[namespaceName][name]);
    for (let i = 0; i < args.length; i++) {
      expect(expectedArgs?.[i]).toContain(args[i].name);
      // to do: check the type
    }

    if (isAsync) {
      expect(isAsyncFunction(parentObject[namespaceName][name])).toBe(true);
    }
  }
};

export const matchApiToSpec = async (parent: object, namespace: string) => {
  const rawJson = await ReaderManager.readFile(
    __dirname + '/../../../api.json',
  );
  const api = JSON.parse(rawJson);
  matchNestedProperties(api, parent, namespace);
  matchNestedNamespaces(api, parent, namespace);
  matchNestedFunctions(api, parent, namespace);
};
