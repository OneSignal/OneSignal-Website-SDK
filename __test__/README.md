# Basic Test

Here is a basic test file template.

```ts
import { TestEnvironment } from '../../support/environment/TestEnvironment';

// mock an entire file
vi.mock('../../../src/MyFile');

describe('My tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestEnvironment.initialize();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test('This is a test description', () => {});
});
```

# Extension

You can use the [ms-playwright](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright) extension to run individual tests by running a "Play" button next to the test case.

You can even right click the "Play" and click "Debug Test" to open a debugger. You can either set a breakpoint or put a `debugger` statement in the src file.

# Common Usages

## Suppress Internal Logging

Your test may result in an error being printed but the test still succeeds. To suppress logs, you can mock the entire Log file.

```ts
// suppress all internal logging
vi.mock('../../../src/shared/libraries/Log');
```

## API

### `nock` (Not Recommended)

Can leverage our custom nock helper to mock a response for some fetch call. E.g,

```ts
import { nock } from '__test__/support/mocks/nock';

nock({}, 400);

await someFetchCall();
```

### `msw`

Mocks all HTTP requests by leveraging msw. If omitted, the status defaults to 200.

```ts
import { server } from '__test__/support/mocks/server';
import { http, HttpResponse } from 'msw';

server.use(
  http.get('https://api.onesignal.com/notifications', () =>
    HttpResponse.json({ result: {}, status: 200 }),
  ),
);

// or

server.use(
  http.get('**/v1/notifications', () =>
    HttpResponse.json({ result: {}, status: 200 }),
  ),
);
```
