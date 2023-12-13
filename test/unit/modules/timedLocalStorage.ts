import '../../support/polyfills/polyfills';
import test from 'ava';
import { TestEnvironment } from '../../support/sdk/TestEnvironment';
import TimedLocalStorage from '../../../src/page/modules/TimedLocalStorage';
import timemachine from 'timemachine';

test('should not throw and return null if LocalStorage is not supported', async (t) => {
  await TestEnvironment.initialize();
  delete (window as any).localStorage;
  t.deepEqual(window.localStorage, undefined);
  const value = TimedLocalStorage.getItem('test');
  t.deepEqual(value, null);
});

test('should set and get item without expiration', async (t) => {
  await TestEnvironment.initialize();
  TimedLocalStorage.setItem('my-key', 'my-value');
  t.deepEqual(TimedLocalStorage.getItem('my-key'), 'my-value');
  timemachine.config({
    timestamp: new Date().getTime() + 1000 * 60 * 60 * 24 * 9999,
  });
  t.deepEqual(TimedLocalStorage.getItem('my-key'), 'my-value');
  timemachine.reset();
});

test('should set and get complex item without expiration', async (t) => {
  await TestEnvironment.initialize();
  const hash = {
    number: 4,
    string: 'text',
    decimal: 4.56,
    nestedHash: {
      moreText: 'text',
    },
    true: true,
    false: false,
  };
  TimedLocalStorage.setItem('my-key', hash, 3);
  t.deepEqual(TimedLocalStorage.getItem('my-key'), hash);
});

test('should set and get item with expiration', async (t) => {
  await TestEnvironment.initialize();
  TimedLocalStorage.setItem('my-key', 'my-value', 3);
  t.deepEqual(TimedLocalStorage.getItem('my-key'), 'my-value');
  timemachine.config({
    timestamp: new Date().getTime() + 1000 * 60 * 2,
  });
  t.deepEqual(TimedLocalStorage.getItem('my-key'), 'my-value');
  timemachine.config({
    timestamp: new Date().getTime() + 1000 * 60 * 3,
  });
  t.deepEqual(TimedLocalStorage.getItem('my-key'), null);
  timemachine.reset();
});
