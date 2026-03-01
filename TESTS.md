# Testing Guidelines

## Basic Test

Here is a basic test file template.

```ts
import { TestEnvironment } from '../../support/environment/TestEnvironment';

// mock an entire file
vi.mock('../../../src/MyFile');

describe('My tests', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test('This is a test description', () => {});
});
```

## Extension

You can use the [ms-playwright](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright) extension to run individual tests by running a "Play" button next to the test case.

You can even right click the "Play" and click "Debug Test" to open a debugger. You can either set a breakpoint or put a `debugger` statement in the src file.

## Common Usages

### Suppress Internal Logging

Your test may result in an error being printed but the test still succeeds. To suppress logs, you can mock the entire Log file.

```ts
// suppress all internal logging
vi.mock('../../../src/shared/libraries/Log');
```

### API

#### `nock` (Not Recommended)

Can leverage our custom nock helper to mock a response for some fetch call. E.g,

```ts
import { nock } from '__test__/support/mocks/nock';

nock({}, 400);

await someFetchCall();
```

#### `msw`

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

## Fake Timers and IndexedDB

`fake-indexeddb` does not work correctly when `vi.useFakeTimers()` is called without restrictions. Faking all timers interferes with IndexedDB's internal async operations, causing tests to hang or fail.

### Rules

1. **Never use `vi.useFakeTimers()` without a `toFake` list** in tests that touch IndexedDB (directly or indirectly through code that reads/writes to the database).

2. **If you only need to fake specific timer APIs**, pass a `toFake` array with only what you need:

```ts
// Only fake setInterval
vi.useFakeTimers({ toFake: ['setInterval'] });

// Only fake Date
vi.useFakeTimers({ toFake: ['Date'] });

// Only fake setTimeout/clearTimeout
vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
```

3. **If you need to avoid time-based delays**, use the `mockDelay` helper instead of fake timers. It mocks the `delay` function from `src/shared/helpers/general` to resolve immediately:

```ts
import { mockDelay } from '__test__/support/helpers/setup';

// Must be called at the top level of the test file (alongside other vi.mock calls)
mockDelay();
```

You can then assert on the delay spy to verify the correct delay duration was requested:

```ts
import { delay as delaySpy } from 'src/shared/helpers/general';

expect(delaySpy).toHaveBeenCalledWith(30000);
```

### Global Setup

`setupTests.ts` mocks all operation repo timing constants to small values (10ms), so tests using real timers will not have long waits. This means most tests can run without fake timers at all.
