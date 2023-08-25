import { ReaderManager } from '../managers/ReaderManager';

export function isAsyncFunction(fn: () => any): boolean {
  const fnStr = fn.toString().trim();
  return !!(
    fnStr.startsWith('async ') ||
    fnStr.includes('await') ||
    fn instanceof Promise
  );
}

export const getFunctionSignature = (func: () => any) => {
  // Convert the function to a string
  const funcStr = func.toString();

  // Use a regular expression to match the function signature
  const signatureRegex =
    /^(async\s*)?(public\s*)?(protected\s*)?(private\s*)?(static\s*)?(function)?(\s*\w*\s*\(([^)]*(?:\s*:\s*[^,]+,?)*)\))/;
  const match = funcStr.match(signatureRegex);

  // Return the matched signature, or null if not found
  return match ? match[0] : null;
};

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

    // for each argument, check the name and type
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const funcSig = getFunctionSignature(parentObject[namespaceName][name]);
      expect(funcSig).toContain(arg.name);
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
