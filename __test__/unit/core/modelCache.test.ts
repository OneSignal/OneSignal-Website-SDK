import ModelCache from "../../../src/core/caching/ModelCache";
import { OSModel } from "../../../src/core/modelRepo/OSModel";
import { ModelName } from "../../../src/core/models/SupportedModels";
import { TestEnvironment } from "../../support/TestEnvironment";

describe('ModelCache tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    test.stub(ModelCache.prototype, 'load', Promise.resolve({}));
    TestEnvironment.initialize();
  });

  test('ModelCache adds model to IndexedDB', async () => {
    const modelCache = new ModelCache();
    const model = new OSModel(ModelName.Identity, {id: 'test'});
    await modelCache.add(ModelName.Identity, model);
    const cachedModels = await modelCache.getCachedEncodedModels(ModelName.Identity);
    expect(cachedModels.length).toEqual(1);
  });

  test('ModelCache adds multiple models to IndexedDB', async () => {
    const modelCache = new ModelCache();
    const model1 = new OSModel(ModelName.Identity, {id: 'test1'});
    const model2 = new OSModel(ModelName.Identity, {id: 'test2'});
    await modelCache.add(ModelName.Identity, model1);
    await modelCache.add(ModelName.Identity, model2);
    const cachedModels = await modelCache.getCachedEncodedModels(ModelName.Identity);
    expect(cachedModels.length).toEqual(2);
  });

  test('ModelCache updates model in IndexedDB', async () => {
    const MODEL_ID = '11111';
    const modelCache = new ModelCache();
    const data = { myAlias: 'myAliasId' };
    const model = new OSModel(ModelName.Identity, data, MODEL_ID);
    await modelCache.add(ModelName.Identity, model);
    const newData = { myAlias: 'myAliasId2' };
    await modelCache.update(ModelName.Identity, MODEL_ID, "myAlias", newData.myAlias);
    const updatedModel = await modelCache.get(ModelName.Identity, MODEL_ID);
    expect(updatedModel).toEqual({ modelId: MODEL_ID, modelName: ModelName.Identity, ...newData});
  });

  test('ModelCache removes model from IndexedDB', async () => {
    const modelCache = new ModelCache();
    const model = new OSModel(ModelName.Identity, {id: 'test'});
    await modelCache.add(ModelName.Identity, model);
    await modelCache.remove(ModelName.Identity, model.modelId);
    const cachedModels = await modelCache.getCachedEncodedModels(ModelName.Identity);
    expect(cachedModels.length).toEqual(0);
  });

  test('ModelCache decode returns null when no models exist', async () => {
    const modelCache = new ModelCache();
    const model = await modelCache.get(ModelName.Identity, 'test');
    expect(model).toBeNull();
  });

  test('ModelCache decode returns model when one model exists', async () => {
    const modelCache = new ModelCache();
    const model = new OSModel(ModelName.Identity, {id: 'test'});
    await modelCache.add(ModelName.Identity, model);
    const cachedModel = await modelCache.getAndDecodeModelsWithModelName(ModelName.Identity);
    // upstream bug workaround https://github.com/facebook/jest/issues/8475
    expect(JSON.stringify(cachedModel?.[0])).toEqual(JSON.stringify(model));
  });

  test('ModelCache decode returns models when multiple models exist w/ same name', async () => {
    const modelCache = new ModelCache();
    const model1 = new OSModel(ModelName.Identity, {id: 'test1'});
    const model2 = new OSModel(ModelName.Identity, {id: 'test2'});
    await modelCache.add(ModelName.Identity, model1);
    await modelCache.add(ModelName.Identity, model2);
    const cachedModels = await modelCache.getAndDecodeModelsWithModelName(ModelName.Identity);
    expect(cachedModels?.length).toBe(2);
  });

  test('ModelCache decode returns models when multiple models exist w/ different names', async () => {
    const modelCache = new ModelCache();
    const model1 = new OSModel(ModelName.Identity, {id: 'test1'});
    const model2 = new OSModel(ModelName.Identity, {id: 'test2'});
    const model3 = new OSModel(ModelName.EmailSubscriptions, {id: 'test3'});
    await modelCache.add(ModelName.Identity, model1);
    await modelCache.add(ModelName.Identity, model2);
    await modelCache.add(ModelName.EmailSubscriptions, model3);
    const cachedModels = await modelCache.getAndDecodeModelsWithModelName(ModelName.Identity);
    expect(cachedModels?.length).toBe(2);
  });

  test('Multiple ModelCache updates result in correct IndexedDB state -> mutex working', async () => {
    const modelCache = new ModelCache();
    const model = new OSModel(ModelName.Identity, {id: 'test'});
    await modelCache.add(ModelName.Identity, model);
    const newData = { myAlias: 'myAliasId2' };
    await modelCache.update(ModelName.Identity, model.modelId, "id", "test2");
    await modelCache.update(ModelName.Identity, model.modelId, "id", "test3");
    await modelCache.update(ModelName.Identity, model.modelId, "myAlias", newData.myAlias);
    const updatedModel = await modelCache.get(ModelName.Identity, model.modelId);
    expect(updatedModel).toEqual({ modelId: model.modelId, modelName: ModelName.Identity, ...newData, id: "test3"});
  });
});
