#!/usr/bin/env node
import { indexedDB } from 'fake-indexeddb';
import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

type ApiFunction = {
  name: string;
  isAsync: boolean;
  args: Array<{ name: string; type: string; optional: boolean }>;
  returnType: string;
};

type ApiProperty = {
  name: string;
  type: string;
};

type ApiNamespace = {
  functions?: ApiFunction[];
  properties?: ApiProperty[];
  namespaces?: string[];
};

type ApiSpec = {
  [namespace: string]: ApiNamespace;
};

const loadApiSpec = (): ApiSpec => {
  const apiPath = join(projectRoot, 'api.json');
  const content = readFileSync(apiPath, 'utf-8');
  return JSON.parse(content) as ApiSpec;
};

const loadBundle = (): string => {
  const bundlePath = join(
    projectRoot,
    'build/releases/OneSignalSDK.page.es6.js',
  );
  return readFileSync(bundlePath, 'utf-8');
};

const createJSDOMEnvironment = () => {
  const dom = new JSDOM(
    '<!DOCTYPE html><html><head></head><body></body></html>',
    {
      url: 'https://test.example.com',
      pretendToBeVisual: true,
      resources: 'usable',
      runScripts: 'dangerously',
    },
  );

  const window = dom.window;

  // Add missing properties that OneSignal might need
  window.OneSignalDeferred = [];

  if (!window.indexedDB) {
    window.indexedDB = indexedDB;
  }

  // Mock ServiceWorker if not available
  if (!window.navigator.serviceWorker) {
    window.navigator.serviceWorker = {
      register: () => Promise.resolve({}),
      ready: Promise.resolve({}),
      controller: null,
      addEventListener: () => {},
      removeEventListener: () => {},
    } as any;
  }

  return window;
};

const validateApiStructure = (
  oneSignal: any,
  apiSpec: ApiSpec,
): { passed: number; failed: string[] } => {
  const failed: string[] = [];
  let passed = 0;

  const validateNamespaceRecursive = (
    spec: ApiNamespace,
    obj: any,
    path: string[],
  ) => {
    const pathStr = path.join('.');

    // Validate functions
    spec.functions?.forEach((func) => {
      if (typeof obj[func.name] === 'function') {
        passed++;
        console.log(`✓ ${pathStr}.${func.name}()`);
      } else {
        failed.push(
          `${pathStr}.${func.name}() - function not found or mangled`,
        );
      }
    });

    // Validate properties by checking descriptors (don't trigger getters)
    spec.properties?.forEach((prop) => {
      try {
        // Check if property exists as own property or in prototype chain
        const hasOwnProperty = Object.hasOwnProperty.call(obj, prop.name);
        const ownDescriptor = Object.getOwnPropertyDescriptor(obj, prop.name);
        const protoDescriptor = Object.getOwnPropertyDescriptor(
          Object.getPrototypeOf(obj),
          prop.name,
        );

        const exists =
          hasOwnProperty ||
          (ownDescriptor &&
            (ownDescriptor.get || ownDescriptor.value !== undefined)) ||
          (protoDescriptor &&
            (protoDescriptor.get || protoDescriptor.value !== undefined));

        if (exists) {
          passed++;
          console.log(`✓ ${pathStr}.${prop.name}`);
        } else {
          failed.push(
            `${pathStr}.${prop.name} - property not found or mangled`,
          );
        }
      } catch (e) {
        failed.push(
          `${pathStr}.${prop.name} - error checking property: ${e.message}`,
        );
      }
    });

    // Validate nested namespaces
    spec.namespaces?.forEach((namespaceName) => {
      const namespacePath = [...path, namespaceName];
      const namespacePathStr = namespacePath.join('.');

      if (obj[namespaceName] && typeof obj[namespaceName] === 'object') {
        passed++;
        console.log(`✓ ${namespacePathStr} namespace`);

        const nestedSpec = apiSpec[namespaceName];
        const nestedObj = obj[namespaceName];
        if (nestedSpec && nestedObj) {
          validateNamespaceRecursive(nestedSpec, nestedObj, namespacePath);
        }
      } else {
        failed.push(`${namespacePathStr} - namespace not found or mangled`);
      }
    });
  };

  const oneSignalSpec = apiSpec.OneSignal;
  if (oneSignalSpec) {
    validateNamespaceRecursive(oneSignalSpec, oneSignal, ['OneSignal']);
  }

  return { passed, failed };
};

const validateBundle = async (): Promise<void> => {
  console.log('🔍 Validating OneSignal bundle against API specification...\n');

  try {
    console.log('📋 Loading API specification...');
    const apiSpec = loadApiSpec();

    console.log('📦 Loading bundle...');
    const bundleCode = loadBundle();

    console.log('🌐 Creating JSDOM environment...');
    const window = createJSDOMEnvironment();

    console.log('⚡ Executing bundle...');
    const script = window.document.createElement('script');
    script.textContent = bundleCode;
    window.document.head.appendChild(script);

    // Give it a moment to execute
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (!window.OneSignal) {
      throw new Error(
        'OneSignal object not found in global scope after bundle execution',
      );
    }

    console.log('✅ Bundle executed successfully\n');

    console.log('🔎 Validating API structure...\n');
    const { passed, failed } = validateApiStructure(window.OneSignal, apiSpec);

    console.log(`\n📊 Validation Results:`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed.length}`);

    if (failed.length > 0) {
      console.log('\n💥 Failed validations:');
      failed.forEach((error) => console.log(`  ❌ ${error}`));
      process.exit(1);
    } else {
      console.log('\n🎉 All API validations passed!');
      console.log(
        'The built bundle correctly exposes all expected APIs without mangling.',
      );
    }
  } catch (error) {
    console.error('💥 Validation failed with error:', error.message);
    process.exit(1);
  }
};

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateBundle().catch((error) => {
    console.error('💥 Validation script failed:', error);
    process.exit(1);
  });
}

export { validateBundle };
