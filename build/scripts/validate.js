#!/usr/bin/env node
import { indexedDB } from 'fake-indexeddb';
import 'fake-indexeddb/auto';
import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';

const loadJson = (path) => JSON.parse(readFileSync(path, 'utf-8'));

const SHOW_VERBOSE = process.env.VERBOSE === 'true';

const setupEnvironment = () => {
  const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'https://test.example.com',
    pretendToBeVisual: true,
    runScripts: 'dangerously',
  });

  window.OneSignalDeferred = [];
  window.indexedDB = indexedDB;
  window.IDBRequest = global.IDBRequest;
  window.IDBTransaction = global.IDBTransaction;
  window.IDBDatabase = global.IDBDatabase;
  window.IDBObjectStore = global.IDBObjectStore;
  window.IDBIndex = global.IDBIndex;
  window.IDBCursor = global.IDBCursor;
  window.navigator.serviceWorker = {};

  return window;
};

const validateNamespace = (obj, spec, apiSpec, path = 'OneSignal') => {
  const errors = [];

  spec.functions?.forEach(({ name }) => {
    if (typeof obj[name] === 'function') {
      if (SHOW_VERBOSE) console.log(`✓ ${path}.${name}()`);
    } else {
      errors.push(`${path}.${name}() - function missing`);
    }
  });

  spec.properties?.forEach(({ name }) => {
    const exists =
      name in obj ||
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(obj), name);
    if (exists) {
      if (SHOW_VERBOSE) console.log(`✓ ${path}.${name}`);
    } else {
      errors.push(`${path}.${name} - property missing`);
    }
  });

  spec.namespaces?.forEach((name) => {
    if (obj[name] && typeof obj[name] === 'object') {
      if (SHOW_VERBOSE) console.log(`✓ ${path}.${name} namespace`);

      const nestedSpec = apiSpec[name];
      if (nestedSpec) {
        const nestedErrors = validateNamespace(
          obj[name],
          nestedSpec,
          apiSpec,
          `${path}.${name}`,
        );
        errors.push(...nestedErrors);
      }
    } else {
      errors.push(`${path}.${name} - namespace missing`);
    }
  });

  return errors;
};

const validateBundle = async () => {
  console.log('🔍 Validating OneSignal bundle...\n');

  const apiSpec = loadJson('api.json');
  const bundle = readFileSync(
    'build/releases/OneSignalSDK.page.es6.js',
    'utf-8',
  );
  const window = setupEnvironment();

  const script = window.document.createElement('script');
  script.textContent = bundle;
  window.document.head.appendChild(script);

  await new Promise((resolve) => setTimeout(resolve, 100));

  if (!window.OneSignal) throw new Error('OneSignal not found');

  const errors = validateNamespace(
    window.OneSignal,
    apiSpec.OneSignal,
    apiSpec,
  );

  if (errors.length > 0) {
    console.log('❌ Validation failures:');
    errors.forEach((error) => console.log(`  ${error}`));
    process.exit(1);
  }

  console.log('✅ All API validations passed!');
};

if (import.meta.url === `file://${process.argv[1]}`) {
  validateBundle().catch((error) => {
    console.error('💥 Validation failed:', error.message);
    process.exit(1);
  });
}

export { validateBundle };
