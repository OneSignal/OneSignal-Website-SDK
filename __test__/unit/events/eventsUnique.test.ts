import { expect, test } from "vitest";
import { ONESIGNAL_EVENTS } from '../../../src/onesignal/OneSignalEvents';

test('Test uniqueness of OneSignal event names', () => {
  const events = Object.values(ONESIGNAL_EVENTS);
  const uniqueEvents = [...new Set(events)];
  expect(events.length).toEqual(uniqueEvents.length);
});
