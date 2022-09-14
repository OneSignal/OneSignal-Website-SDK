import { TestEnvironment } from "../../support/sdk/TestEnvironment";
import test from 'ava';
import ModelCache from "../../../src/core/caching/ModelCache";
import { OSModel } from "../../../src/core/modelRepo/OSModel";
import { IdentityModel } from "../../../src/core/models/IdentityModel";
import { SubscriptionType, SupportedSubscription } from "../../../src/core/models/SubscriptionModels";
import { ModelName } from "../../../src/core/models/SupportedModels";
import Database from "../../../src/shared/services/Database";

const MODEL_ID = '0000000000';
const MODEL_ID_2 = '1111111111';

test("model cache: add model -> added to IndexedDB", async t => {
  await TestEnvironment.initialize();
  const modelCache = new ModelCache();
  const data = { myAlias: "myAliasId" };
  const model = new OSModel(ModelName.Identity, MODEL_ID, data);
  await modelCache.add(ModelName.Identity, model);
  const result = await Database.get(ModelName.Identity, MODEL_ID);
  t.deepEqual(result, { modelId: MODEL_ID, modelName: ModelName.Identity, ...data });
});

test("model cache: add multiple models -> added to IndexedDB", async t => {
  await TestEnvironment.initialize();
  const modelCache = new ModelCache();
  const data = { myAlias: "myAliasId" };
  const model = new OSModel(ModelName.Identity, MODEL_ID, data);
  await modelCache.add(ModelName.Identity, model);
  const model2 = new OSModel(ModelName.Identity, MODEL_ID_2, data);
  await modelCache.add(ModelName.Identity, model2);
  const result = await Database.getAll(ModelName.Identity);
  t.deepEqual(result, [
    { modelId: MODEL_ID, modelName: ModelName.Identity, ...data },
    { modelId: MODEL_ID_2, modelName: ModelName.Identity, ...data }
  ]);
});

test("model cache: update model -> updated in IndexedDB", async t => {
  await TestEnvironment.initialize();
  const modelCache = new ModelCache();
  const data = { myAlias: "myAliasId" };
  const model = new OSModel(ModelName.Identity, MODEL_ID, data);
  await modelCache.add(ModelName.Identity, model);
  const newData = { myAlias: "myNewAliasId" };
  await modelCache.update(ModelName.Identity, MODEL_ID, "myAlias", newData.myAlias);
  const result = await Database.get(ModelName.Identity, MODEL_ID);
  t.deepEqual(result, { modelId: MODEL_ID, modelName: ModelName.Identity, ...newData });
});

test("model cache: remove model -> removed from IndexedDB", async t => {
  await TestEnvironment.initialize();
  const modelCache = new ModelCache();
  const data = { myAlias: "myAliasId" };
  const model = new OSModel(ModelName.Identity, MODEL_ID, data);
  await modelCache.add(ModelName.Identity, model);
  await modelCache.remove(ModelName.Identity, MODEL_ID);
  const result = await Database.get(ModelName.Identity, MODEL_ID);
  t.is(result, null);
});

test("decode all models with model name: no models -> returns undefined", async t => {
  await TestEnvironment.initialize();
  const modelCache = new ModelCache();
  const result = await modelCache.getAndDecodeModelsWithModelName(ModelName.Identity);
  t.deepEqual(result, undefined);
});

test("decode all models with model name: one model -> returns model", async t => {
  await TestEnvironment.initialize();
  const modelCache = new ModelCache();
  const data = {
    onesignalId: "00000000-0000-0000-0000-000000000000",
    myAlias: "myAliasId"
  };
  const model = new OSModel<IdentityModel>(ModelName.Identity, MODEL_ID, data);
  await modelCache.add(ModelName.Identity, model);
  const result = await modelCache.getAndDecodeModelsWithModelName(ModelName.Identity);
  t.deepEqual(result, [model]);
});

test("decode all models with model name: multiple models -> returns models", async t => {
  await TestEnvironment.initialize();
  const modelCache = new ModelCache();
  const data = {
    onesignalId: "00000000-0000-0000-0000-000000000000",
    myAlias: "myAliasId"
  };
  const model = new OSModel<IdentityModel>(ModelName.Identity, MODEL_ID, data);
  await modelCache.add(ModelName.Identity, model);
  const model2 = new OSModel<IdentityModel>(ModelName.Identity, MODEL_ID_2, data);
  await modelCache.add(ModelName.Identity, model2);
  const result = await modelCache.getAndDecodeModelsWithModelName(ModelName.Identity);
  t.deepEqual(result, [model, model2]);
});

test("decode all models with model name: multiple models with different model names -> returns models with correct model name", async t => {
  await TestEnvironment.initialize();
  const modelCache = new ModelCache();
  const identityData = {
    onesignalId: "00000000-0000-0000-0000-000000000000",
    myAlias: "myAliasId"
  };
  const subscriptionData = {
    type: SubscriptionType.Email
  };
  const model = new OSModel<IdentityModel>(ModelName.Identity, MODEL_ID, identityData);
  await modelCache.add(ModelName.Identity, model);
  const model2 = new OSModel<IdentityModel>(ModelName.Identity, MODEL_ID_2, identityData);
  await modelCache.add(ModelName.Identity, model2);
  const model3 = new OSModel<SupportedSubscription>(ModelName.EmailSubscriptions, MODEL_ID_2, subscriptionData);
  await modelCache.add(ModelName.EmailSubscriptions, model3);
  const result = await modelCache.getAndDecodeModelsWithModelName(ModelName.Identity);
  t.deepEqual(result, [model, model2]);
});
