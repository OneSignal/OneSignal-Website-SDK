import test, { ExecutionContext } from "ava";
import OneSignal from "../../../src/OneSignal";
import { TestEnvironment } from "../../support/sdk/TestEnvironment";
import Context from "../../../src/models/Context";
import sinon, { SinonSandbox } from 'sinon';
import { DismissHelper } from "../../../src/helpers/DismissHelper";

let sinonSandbox: SinonSandbox = sinon.sandbox.create();

test.afterEach(function (_t: ExecutionContext) {
  sinonSandbox.restore();
});

test("Test showHttpPrompt with no params", async t => {
  await TestEnvironment.initialize();
  const appConfig = TestEnvironment.getFakeAppConfig();
  OneSignal.context = new Context(appConfig);

  sinonSandbox.stub(DismissHelper, "wasPromptOfTypeDismissed").resolves(true);
  sinonSandbox.stub(OneSignal, "privateIsPushNotificationsEnabled").resolves(false);

  // Ensure both public and private calls work
  await OneSignal.showHttpPrompt();
  await OneSignal.context.promptsManager.internalShowSlidedownPrompt();
  // Pass if we did not throw
  t.pass();
});
