import test, { ExecutionContext } from "ava";
import OneSignal from "../../../src/OneSignal";
import { TestEnvironment } from "../../support/sdk/TestEnvironment";
import Context from "../../../src/models/Context";
import MainHelper from "../../../src/helpers/MainHelper";
import sinon, { SinonSandbox } from 'sinon';

const sinonSandbox: SinonSandbox = sinon.sandbox.create();

test.afterEach(function (_t: ExecutionContext) {
  sinonSandbox.restore();
});

test.todo("fix test");

/*
test("Test showHttpPrompt with no params", async t => {
  await TestEnvironment.initialize();
  const appConfig = TestEnvironment.getFakeAppConfig();
  OneSignal.context = new Context(appConfig);

  sinonSandbox.stub(DismissHelper, "wasPromptOfTypeDismissed").resolves(true);
  sinonSandbox.stub(OneSignal, "privateIsPushNotificationsEnabled").resolves(false);

  // Ensure both public and private calls work
  await OneSignal.showHttpPrompt();
  await OneSignal.context.promptsManager.internalShowAutoPrompt();
  // Pass if we did not throw
  t.pass();
});
*/