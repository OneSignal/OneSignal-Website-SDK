import { APP_ID, DUMMY_ONESIGNAL_ID } from '__test__/support/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import {
  addAliasFn,
  deleteAliasFn,
  mockPageStylesCss,
  mockServerConfig,
  setAddAliasResponse,
  setDeleteAliasResponse,
} from '__test__/support/helpers/requests';
import { server } from '__test__/support/mocks/server';
import { IdentityModel } from 'src/core/models/IdentityModel';
import { OP_REPO_EXECUTION_INTERVAL } from 'src/core/operationRepo/constants';
import Database from 'src/shared/services/Database';

vi.useFakeTimers();

describe('OneSignal', () => {
  beforeAll(async () => {
    server.use(mockServerConfig(), mockPageStylesCss());
    const _onesignal = await TestEnvironment.initialize();
    window.OneSignal = _onesignal;

    await Database.put('identity', {
      modelId: '123',
      onesignalId: DUMMY_ONESIGNAL_ID,
    });
    await window.OneSignal.init({ appId: APP_ID });
  });

  beforeEach(() => {
    // reset the identity model
    const newIdentityModel = new IdentityModel();
    newIdentityModel.onesignalId = DUMMY_ONESIGNAL_ID;
    window.OneSignal.coreDirector
      .getIdentityModel()
      .initializeFromJson(newIdentityModel.toJSON());
  });

  describe('User', () => {
    describe('aliases', () => {
      beforeEach(() => {
        setAddAliasResponse();
        addAliasFn.mockClear();
        deleteAliasFn.mockClear();
      });

      test('can add an alias to the current user', async () => {
        window.OneSignal.User.addAlias('someLabel', 'someId');
        const identityModel = window.OneSignal.coreDirector.getIdentityModel();
        expect(identityModel.getProperty('someLabel')).toBe('someId');

        // should make a request to the backend
        await vi.advanceTimersByTimeAsync(OP_REPO_EXECUTION_INTERVAL * 2);
        expect(addAliasFn).toHaveBeenCalledWith({
          identity: {
            someLabel: 'someId',
          },
        });
      });

      test('can add multiple aliases to the current user', async () => {
        window.OneSignal.User.addAlias('someLabel', 'someId');
        window.OneSignal.User.addAlias('someLabel2', 'someId2');

        const identityModel = window.OneSignal.coreDirector.getIdentityModel();
        expect(identityModel.getProperty('someLabel')).toBe('someId');
        expect(identityModel.getProperty('someLabel2')).toBe('someId2');

        await vi.advanceTimersByTimeAsync(OP_REPO_EXECUTION_INTERVAL * 3);
        expect(addAliasFn).toHaveBeenCalledWith({
          identity: {
            someLabel: 'someId',
          },
        });
        expect(addAliasFn).toHaveBeenCalledWith({
          identity: {
            someLabel2: 'someId2',
          },
        });
      });

      test('can delete an alias from the current user', async () => {
        setDeleteAliasResponse();

        window.OneSignal.User.addAlias('someLabel', 'someId');
        await vi.advanceTimersByTimeAsync(OP_REPO_EXECUTION_INTERVAL * 2);
        window.OneSignal.User.removeAlias('someLabel');

        const identityModel = window.OneSignal.coreDirector.getIdentityModel();
        expect(identityModel.getProperty('someLabel')).toBeUndefined();

        await vi.advanceTimersByTimeAsync(OP_REPO_EXECUTION_INTERVAL * 2);
        expect(deleteAliasFn).toHaveBeenCalled();
      });

      test('can delete multiple aliases from the current user', async () => {
        setDeleteAliasResponse();

        window.OneSignal.User.addAlias('someLabel', 'someId');
        window.OneSignal.User.addAlias('someLabel2', 'someId2');
        await vi.advanceTimersByTimeAsync(OP_REPO_EXECUTION_INTERVAL * 2);
        window.OneSignal.User.removeAlias('someLabel');
        window.OneSignal.User.removeAlias('someLabel2');

        await vi.advanceTimersByTimeAsync(OP_REPO_EXECUTION_INTERVAL * 4);
        expect(deleteAliasFn).toHaveBeenCalledTimes(2);
      });
    });
  });
});
