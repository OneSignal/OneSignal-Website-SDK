import { TestEnvironment } from '../../support/environment/TestEnvironment';
import User from '../../../src/onesignal/User';
import { ModelName } from '../../../src/core/models/SupportedModels';
import { getDummyPropertyOSModel } from '../../support/helpers/core';

// suppress all internal logging
jest.mock('../../../src/shared/libraries/Log');

describe('User tests', () => {
  test('getTags called without a properties model should return undefined tags', async () => {
    await TestEnvironment.initialize();

    const user = User.createOrGetInstance();
    const tags = user.getTags();

    expect(tags).toBe(undefined);
  });

  test('getTags called with undefined tags in properties model should return undefined tags', async () => {
    await TestEnvironment.initialize();

    OneSignal.coreDirector.add(ModelName.Properties, getDummyPropertyOSModel());

    const user = User.createOrGetInstance();
    const tags = user.getTags();

    expect(tags).toBe(undefined);
  });

  test('getTags called with empty tags in properties model should return empty tags', async () => {
    await TestEnvironment.initialize();

    const propertyModel = getDummyPropertyOSModel();
    propertyModel.set('tags', {});
    OneSignal.coreDirector.add(ModelName.Properties, propertyModel);

    const user = User.createOrGetInstance();
    const tags = user.getTags();

    expect(tags).toStrictEqual({});
  });

  test('getTags called with tags in properties model should return tags', async () => {
    await TestEnvironment.initialize();

    const tagsSample = { key1: 'value1' };

    const propertyModel = getDummyPropertyOSModel();
    propertyModel.set('tags', tagsSample);
    OneSignal.coreDirector.add(ModelName.Properties, propertyModel);

    const user = User.createOrGetInstance();
    const tags = user.getTags();

    expect(tags).toBe(tagsSample);
  });


  test('getLanguage should return the correct user language', async () => {
    await TestEnvironment.initialize();

    const languageSample = 'fr'

    const propertyModel = getDummyPropertyOSModel();
    propertyModel.set('language', languageSample);
    OneSignal.coreDirector.add(ModelName.Properties, propertyModel);

    const user = User.createOrGetInstance();
    const language = user.getLanguage();

    expect(language).toBe(languageSample);
  });
});
