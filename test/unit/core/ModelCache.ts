import { TestEnvironment } from "../../support/sdk/TestEnvironment";
import test from 'ava';
import ModelCache from "../../../src/core/caching/ModelCache";
import { OSModel } from "../../../src/core/modelRepo/OSModel";
import { SubscriptionType, SupportedSubscription } from "../../../src/core/models/SubscriptionModels";
import { ModelName, SupportedModel } from "../../../src/core/models/SupportedModels";
import Database from "../../../src/shared/services/Database";
import sinon from "sinon";

const MODEL_ID = '0000000000';
const MODEL_ID_2 = '1111111111';

test.beforeEach(async () => {
  sinon.useFakeTimers();
  await TestEnvironment.initialize();
  TestEnvironment.mockInternalOneSignal();
});

test("model cache: add model -> added to IndexedDB", async t => {
  const modelCache = new ModelCache();
  const data = { myAlias: "myAliasId" };
  const model = new OSModel(ModelName.Identity, data, MODEL_ID);
  await modelCache.add(ModelName.Identity, model);
  const result = await Database.get(ModelName.Identity, MODEL_ID);
  t.deepEqual(result, { modelId: MODEL_ID, modelName: ModelName.Identity, ...data });
});

test("model cache: add multiple models -> added to IndexedDB", async t => {
  const modelCache = new ModelCache();
  const data = { myAlias: "myAliasId" };
  const model = new OSModel(ModelName.Identity, data, MODEL_ID);
  await modelCache.add(ModelName.Identity, model);
  const model2 = new OSModel(ModelName.Identity, data, MODEL_ID_2);
  await modelCache.add(ModelName.Identity, model2);
  const result = await Database.getAll(ModelName.Identity);
  t.deepEqual(result, [
    { modelId: MODEL_ID, modelName: ModelName.Identity, ...data },
    { modelId: MODEL_ID_2, modelName: ModelName.Identity, ...data }
  ]);
});

test("model cache: update model -> updated in IndexedDB", async t => {
  const modelCache = new ModelCache();
  const data = { myAlias: "myAliasId" };
  const model = new OSModel(ModelName.Identity, data, MODEL_ID);
  await modelCache.add(ModelName.Identity, model);
  const newData = { myAlias: "myNewAliasId" };
  await modelCache.update(ModelName.Identity, MODEL_ID, "myAlias", newData.myAlias);
  const result = await Database.get(ModelName.Identity, MODEL_ID);
  t.deepEqual(result, { modelId: MODEL_ID, modelName: ModelName.Identity, ...newData });
});

test("model cache: remove model -> removed from IndexedDB", async t => {
  const modelCache = new ModelCache();
  const data = { myAlias: "myAliasId" };
  const model = new OSModel(ModelName.Identity, data, MODEL_ID);
  await modelCache.add(ModelName.Identity, model);
  await modelCache.remove(ModelName.Identity, MODEL_ID);
  const result = await Database.get(ModelName.Identity, MODEL_ID);
  t.is(result, null);
});

test("decode all models with model name: no models -> returns undefined", async t => {
  const modelCache = new ModelCache();
  const result = await modelCache.getAndDecodeModelsWithModelName(ModelName.Identity);
  t.deepEqual(result, undefined);
});

test("decode all models with model name: one model -> returns model", async t => {
  const modelCache = new ModelCache();
  const data = {
    onesignalId: "00000000-0000-0000-0000-000000000000",
    myAlias: "myAliasId"
  };
  const model = new OSModel<SupportedModel>(ModelName.Identity, data, MODEL_ID);
  await modelCache.add(ModelName.Identity, model);
  const result = await modelCache.getAndDecodeModelsWithModelName(ModelName.Identity);
  t.deepEqual(result, [model]);
});

test("decode all models with model name: multiple models -> returns models", async t => {
  const modelCache = new ModelCache();
  const data = {
    onesignalId: "00000000-0000-0000-0000-000000000000",
    myAlias: "myAliasId"
  };
  const model = new OSModel<SupportedModel>(ModelName.Identity, data, MODEL_ID);
  await modelCache.add(ModelName.Identity, model);
  const model2 = new OSModel<SupportedModel>(ModelName.Identity, data, MODEL_ID_2);
  await modelCache.add(ModelName.Identity, model2);
  const result = await modelCache.getAndDecodeModelsWithModelName(ModelName.Identity);
  t.deepEqual(result, [model, model2]);
});

test("decode all models with model name: multiple models with different model names -> returns models with correct model name", async t => {
  const modelCache = new ModelCache();
  const identityData = {
    onesignalId: "00000000-0000-0000-0000-000000000000",
    myAlias: "myAliasId"
  };
  const subscriptionData = {
    type: SubscriptionType.Email
  };
  const model = new OSModel<SupportedModel>(ModelName.Identity, identityData, MODEL_ID);
  await modelCache.add(ModelName.Identity, model);
  const model2 = new OSModel<SupportedModel>(ModelName.Identity, identityData, MODEL_ID_2);
  await modelCache.add(ModelName.Identity, model2);
  const model3 = new OSModel<SupportedSubscription>(
    ModelName.EmailSubscriptions, subscriptionData, MODEL_ID_2);
  await modelCache.add(ModelName.EmailSubscriptions, model3);
  const result = await modelCache.getAndDecodeModelsWithModelName(ModelName.Identity);
  t.deepEqual(result, [model, model2]);
});
