export async function throws(testContext, func, error) {
  try {
    await func();
    testContext.fail('expected exception not caught');
  } catch (e) {
    testContext.truthy(e instanceof error);
  }
}

export async function notThrows(testContext, func) {
  try {
    await func();
    testContext.pass('no exception thrown; expected result');
  } catch (e) {
    testContext.fail(e);
  }
}