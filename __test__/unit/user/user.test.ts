import User from '../../../src/onesignal/User';
import { TestEnvironment } from '../../support/environment/TestEnvironment';

// suppress all internal logging
vi.mock('../../../src/shared/libraries/Log');

describe('User tests', () => {
  test('getTags called with unset tags should return empty tags', () => {
    TestEnvironment.initialize();

    const user = User.createOrGetInstance();
    const tags = user.getTags();

    expect(tags).toStrictEqual({});
  });

  test('getTags called with empty tags in properties model should return empty tags', () => {
    TestEnvironment.initialize();

    const user = User.createOrGetInstance();
    const tags = user.getTags();

    expect(tags).toStrictEqual({});
  });

  test('getTags called with tags in properties model should return tags', () => {
    TestEnvironment.initialize();

    const tagsSample = { key1: 'value1' };
    const propModel = OneSignal.coreDirector.getPropertiesModel();
    propModel.tags = tagsSample;

    const user = User.createOrGetInstance();
    const tags = user.getTags();

    expect(tags).toBe(tagsSample);
  });

  test('getLanguage should return the correct user language', () => {
    TestEnvironment.initialize();

    const languageSample = 'fr';

    const propModel = OneSignal.coreDirector.getPropertiesModel();
    propModel.language = languageSample;

    const user = User.createOrGetInstance();
    const language = user.getLanguage();

    expect(language).toBe(languageSample);
  });

  test('setLanguage should call the properties model set method', () => {
    TestEnvironment.initialize();

    const languageSample = 'fr';

    const user = User.createOrGetInstance();
    user.setLanguage(languageSample);

    const propModel = OneSignal.coreDirector.getPropertiesModel();
    expect(propModel.language).toBe(languageSample);
  });
});
