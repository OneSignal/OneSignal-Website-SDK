import { describe, expect, test, vi } from 'vite-plus/test';

import { EventProducer } from './EventProducer';

describe('EventProducer', () => {
  test('fires every subscriber in order', () => {
    const producer = new EventProducer<(v: number) => void>();
    const calls: string[] = [];
    producer._subscribe((v) => calls.push(`a${v}`));
    producer._subscribe((v) => calls.push(`b${v}`));

    producer._fire((h) => h(1));

    expect(calls).toEqual(['a1', 'b1']);
  });

  test('a handler that unsubscribes itself during fire does not skip the next handler', () => {
    const producer = new EventProducer<() => void>();
    const first = vi.fn(() => producer._unsubscribe(first));
    const second = vi.fn();
    producer._subscribe(first);
    producer._subscribe(second);

    producer._fire((h) => h());

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
    expect(producer._hasSubscribers).toBe(true);
  });

  test('a handler subscribed during fire is not called in the same fire', () => {
    const producer = new EventProducer<() => void>();
    const late = vi.fn();
    producer._subscribe(() => producer._subscribe(late));

    producer._fire((h) => h());

    expect(late).not.toHaveBeenCalled();
  });
});
