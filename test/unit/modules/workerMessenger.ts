import "../../support/polyfills/polyfills";
import { TestEnvironment } from "../../support/sdk/TestEnvironment";
import { WorkerMessenger, WorkerMessengerCommand } from '../../../src/libraries/WorkerMessenger';
import ContextSW from '../../../src/models/ContextSW';
import test from "ava";
import Random from "../../support/tester/Random";
import SWLog from "../../../src/libraries/SWLog";
import { buildWorkerMessagingCommandHandlers, applyWorkerMessagingCommandHandlers } from "../../../src/service-worker/WorkerMessengerCommandHandling";


test('service worker should gracefully handle unexpected page messages', async t => {
  await TestEnvironment.initializeForServiceWorker({
    url: new URL(`https://site.com/service-worker.js?a=1&b=2&appId=${Random.getRandomUuid()}&c=3`)
  });

  const appConfig = TestEnvironment.getFakeAppConfig();
  const context = new ContextSW(appConfig);
  const workerMessenger = new WorkerMessenger(context);

  /* We should be guaranteed a MessageEvent with at least an `event.data` property. */
  const undefinedData: any = {
    data: undefined
  };

  try {
    workerMessenger.onWorkerMessageReceivedFromPage(undefinedData);
    workerMessenger.onPageMessageReceivedFromServiceWorker(undefinedData);
  } catch (e) {
    t.fail("message function raised exception:" + e);
  }

  /*
    Page messages sent to the service worker can be sent from any code not related to OneSignal.
    https://github.com/OneSignal/OneSignal-Website-SDK/issues/308
   */
  const unexpectedData: any = {
    event: {
      data: {
        ACTION: "something-random"
      }
    }
  };

  try {
    workerMessenger.onWorkerMessageReceivedFromPage(unexpectedData);
    workerMessenger.onPageMessageReceivedFromServiceWorker(unexpectedData);
  } catch (e) {
    t.fail("message function raised exception:" + e);
  }

  t.pass();
});

test(
  'service worker should accept AMP web push commands',
  async t => {
    await TestEnvironment.initializeForServiceWorker({
      url: new URL(`https://site.com/service-worker.js?a=1&b=2&appId=${Random.getRandomUuid()}&c=3`)
    });

    const appConfig = TestEnvironment.getFakeAppConfig();
    const context = new ContextSW(appConfig);
    const workerMessenger = new WorkerMessenger(context);

    /* We should be guaranteed a MessageEvent with at least an `event.data` property. */
    const data: any = {
      data: {
        command: WorkerMessengerCommand.AmpSubscribe
      }
    };

    const testPromise = new Promise<void>(resolve => {
      workerMessenger.on(WorkerMessengerCommand.AmpSubscribe, () => {
        resolve();
      });
    });

    try {
      workerMessenger.onWorkerMessageReceivedFromPage(data);
    } catch (e) {
      t.fail("message function raised exception:" + e);
    }

    await testPromise;
    t.pass();
  }
);

test(
  'service worker should accept SetLogging commands',
  async t => {
    await TestEnvironment.initializeForServiceWorker({
      url: new URL(`https://site.com/service-worker.js?a=1&b=2&appId=${Random.getRandomUuid()}&c=3`)
    });

    SWLog.resetConsole();
    const defaultConsole = SWLog.singletonConsole;

    t.false(SWLog.enabled);
    t.deepEqual(defaultConsole, SWLog.consoles.null);

    const appConfig = TestEnvironment.getFakeAppConfig();
    const context = new ContextSW(appConfig);
    const workerMessenger = new WorkerMessenger(context);

    /* We should be guaranteed a MessageEvent with at least an `event.data` property. */
    const data: any = {
      data: {
        command: WorkerMessengerCommand.SetLogging,
        payload: {
          shouldLog: true
        }
      }
    };

    const messageHandlers = buildWorkerMessagingCommandHandlers(workerMessenger);
    applyWorkerMessagingCommandHandlers(workerMessenger, messageHandlers);
    workerMessenger.listen();

    try {
      workerMessenger.onWorkerMessageReceivedFromPage(data);
    } catch (e) {
      t.fail("message function raised exception:" + e);
    }

    t.true(SWLog.enabled);
    t.notDeepEqual(SWLog.singletonConsole, defaultConsole);
    t.pass();
  }
);

