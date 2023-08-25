import OneSignalUtils from '../../../src/shared/utils/OneSignalUtils';
import ModelCache from '../../../src/core/caching/ModelCache';
import CoreModule from '../../../src/core/CoreModule';
import { CoreModuleDirector } from '../../../src/core/CoreModuleDirector';
import { ModelRepo } from '../../../src/core/modelRepo/ModelRepo';
import { OSModel } from '../../../src/core/modelRepo/OSModel';
import { CoreChangeType } from '../../../src/core/models/CoreChangeType';
import { CoreDelta } from '../../../src/core/models/CoreDeltas';
import { SubscriptionType } from '../../../src/core/models/SubscriptionModels';
import {
  ModelName,
  SupportedModel,
} from '../../../src/core/models/SupportedModels';
import { isPropertyDelta } from '../../../src/core/utils/typePredicates';
import {
  generateNewSubscription,
  passIfBroadcastNTimes,
} from '../../support/helpers/core';

let core: CoreModule;
let coreDirector: CoreModuleDirector;
let broadcastCount = 0;

// class mocks
jest.mock('../../../src/core/operationRepo/Operation');

describe('ModelRepo tests', () => {
  beforeEach(async () => {
    test.stub(ModelCache.prototype, 'load', Promise.resolve({}));
    test.stub(OneSignalUtils, 'isUsingSubscriptionWorkaround', () => false);
    jest.useFakeTimers();
    core = new CoreModule();
    coreDirector = new CoreModuleDirector(core);
    await core.init();
    broadcastCount = 0;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.resetModules();
  });

  test('ModelRepo add subscription -> +1 subscription model in model store', async () => {
    const processModelAddedSpy = jest.spyOn(
      ModelRepo.prototype as any,
      'processModelAdded',
    );
    const newSub = generateNewSubscription();
    const emailSubModels = coreDirector.getEmailSubscriptionModels();

    expect(Object.keys(emailSubModels).length).toBe(0);

    coreDirector.add(
      ModelName.EmailSubscriptions,
      newSub as OSModel<SupportedModel>,
      true,
    );
    expect(processModelAddedSpy).toHaveBeenCalledTimes(1);
    expect(Object.keys(emailSubModels).length).toBe(1);
  });

  test('ModelRepo remove subscription -> -1 subscription model in model store', async () => {
    const processModelRemovedSpy = jest.spyOn(
      ModelRepo.prototype as any,
      'processModelRemoved',
    );
    const newSub = generateNewSubscription();
    const emailSubModels = coreDirector.getEmailSubscriptionModels();

    coreDirector.add(
      ModelName.EmailSubscriptions,
      newSub as OSModel<SupportedModel>,
      true,
    );
    expect(Object.keys(emailSubModels).length).toBe(1);

    coreDirector.remove(ModelName.EmailSubscriptions, newSub.modelId);
    expect(processModelRemovedSpy).toHaveBeenCalledTimes(1);
    expect(Object.keys(emailSubModels).length).toBe(0);
  });

  test('ModelRepo update subscription property -> change is processed correctly', async () => {
    const TOKEN = 'myToken';
    const processModelUpdatedSpy = jest.spyOn(
      ModelRepo.prototype as any,
      'processModelUpdated',
    );
    const newSub = generateNewSubscription();
    coreDirector.add(
      ModelName.EmailSubscriptions,
      newSub as OSModel<SupportedModel>,
      true,
    );

    newSub.set('token', TOKEN);
    expect(processModelUpdatedSpy).toHaveBeenCalledTimes(1);

    const emailSubModels = coreDirector.getEmailSubscriptionModels();
    const emailModel = emailSubModels[newSub.modelId];
    expect(emailModel.data.token).toBe(TOKEN);
  });

  /* D E L T A S */
  test('ModelRepo add subscription -> delta is broadcasted once', (done: jest.DoneCallback) => {
    core.modelRepo?.subscribe(() => {
      broadcastCount += 1;
      passIfBroadcastNTimes(1, broadcastCount, done);
    });
    const newSub = generateNewSubscription();
    coreDirector.add(
      ModelName.EmailSubscriptions,
      newSub as OSModel<SupportedModel>,
      true,
    );
  });

  test('ModelRepo remove subscription -> delta is broadcasted twice', (done: jest.DoneCallback) => {
    const newSub = generateNewSubscription();

    core.modelRepo?.subscribe(() => {
      broadcastCount += 1;
      passIfBroadcastNTimes(2, broadcastCount, done);
    });

    coreDirector.add(
      ModelName.EmailSubscriptions,
      newSub as OSModel<SupportedModel>,
      true,
    );
    coreDirector.remove(ModelName.EmailSubscriptions, newSub.modelId);
  });

  test('ModelRepo update subscription -> delta is broadcasted twice', (done: jest.DoneCallback) => {
    const newSub = generateNewSubscription();

    core.modelRepo?.subscribe(() => {
      broadcastCount += 1;
      passIfBroadcastNTimes(2, broadcastCount, done);
    });

    coreDirector.add(
      ModelName.EmailSubscriptions,
      newSub as OSModel<SupportedModel>,
      true,
    );
    newSub.set('sdk', 'mySdk');
  });

  test('ModelRepo add subscription -> delta is broadcasted with correct change type and payload', (done: jest.DoneCallback) => {
    const newSub = generateNewSubscription();

    core.modelRepo?.subscribe((delta: CoreDelta<SupportedModel>) => {
      expect(delta.changeType).toBe(CoreChangeType.Add);
      expect(delta.model).toEqual(newSub);
      done();
    });
    coreDirector.add(
      ModelName.EmailSubscriptions,
      newSub as OSModel<SupportedModel>,
      true,
    );
  });
  test('ModelRepo remove subscription -> delta is broadcasted with correct change type and payload', (done: jest.DoneCallback) => {
    const newSub = generateNewSubscription();

    core.modelRepo?.subscribe((delta: CoreDelta<SupportedModel>) => {
      broadcastCount += 1;

      if (broadcastCount === 1) {
        expect(delta.changeType).toBe(CoreChangeType.Add);
        expect(delta.model).toEqual(newSub);
        expect(delta.model.modelId).toBe(newSub.modelId);
        expect(delta.model.modelName).toBe(newSub.modelName);
      } else if (broadcastCount === 2) {
        expect(delta.changeType).toBe(CoreChangeType.Remove);
        done();
      }
    });

    coreDirector.add(
      ModelName.EmailSubscriptions,
      newSub as OSModel<SupportedModel>,
      true,
    );
    coreDirector.remove(ModelName.EmailSubscriptions, newSub.modelId);
  });

  test('ModelRepo update subscription -> delta is broadcasted with correct change type and payload', (done: jest.DoneCallback) => {
    const newSub = generateNewSubscription();

    core.modelRepo?.subscribe((delta: CoreDelta<SupportedModel>) => {
      broadcastCount += 1;
      if (isPropertyDelta(delta)) {
        expect(delta.changeType).toBe(CoreChangeType.Update);
        expect(delta.model).toEqual(newSub);
        expect(delta.property).toBe('sdk');
        expect(delta.newValue).toBe('mySdk');
        done();
      }
    });

    coreDirector.add(
      ModelName.EmailSubscriptions,
      newSub as OSModel<SupportedModel>,
      true,
    );
    newSub.set('sdk', 'mySdk');
  });

  test('ModelRepo hydrate model -> model is synced to the model cache', () => {
    const newSub = generateNewSubscription();

    const modelCacheRemoveSpy = jest.spyOn(
      ModelCache.prototype as any,
      'remove',
    );
    const modelCacheAddSpy = jest.spyOn(ModelCache.prototype as any, 'add');

    coreDirector.add(
      ModelName.EmailSubscriptions,
      newSub as OSModel<SupportedModel>,
      true,
    );

    newSub.hydrate({
      id: 'myId',
      type: SubscriptionType.ChromePush,
    });

    // to sync with cache, we should remove the old copy and add the new one
    expect(modelCacheRemoveSpy).toHaveBeenCalledTimes(1);
    expect(modelCacheAddSpy).toHaveBeenCalledTimes(2);
  });
});
