export default class MockDummy {
  constructor(...classes: any[]) {
    for (let clazz of classes) {
      const descriptors = (Object as any).getOwnPropertyDescriptors(clazz);
      const keys = Object.keys(descriptors);
      for (let key of keys) {
        const value = descriptors[key];
        if (value.value == null) {
          this[key] = null;
          continue;
        }
        switch (value.value.constructor.name) {
          case "Function":
            this[key] = this.dummyFunction.bind(clazz);
            break;
          case "AsyncFunction":
            this[key] = this.dummyFunctionAsync.bind(clazz);
            break;
          case "Array":
            this[key] = [];
            break;
          case "Boolean":
            this[key] = false;
            break;
          case "Number":
            this[key] = 67;
            break;
          case "Promise":
            this[key] = Promise.resolve();
            break;
          case "String":
            this[key] = 'dummystring';
            break;
          case "Error":
            this[key] = new Error('Dummy Error');
            break;
        }
      }
    }
  }

  dummyFunction(..._: any[]) {
    return `Called dummyFunction(${arguments})`;
  }

  async dummyFunctionAsync(..._: any[]) {
    return `Called dummyFunctionAsync()`;
  }
}
