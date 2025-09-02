import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { TestEnvironment } from '../../../__test__/support/environment/TestEnvironment';
import Bell from './Bell';

// Mock dependencies
// vi.mock('src/shared/helpers/DismissHelper');
// vi.mock('src/shared/libraries/Log');
// vi.mock('src/shared/helpers/MainHelper');
// vi.mock('src/shared/managers/LimitStore', () => ({
//   getLast: vi.fn().mockReturnValue(true), // optedOut = true
// }));
// vi.mock('src/shared/helpers/init', () => ({
//   registerForPushNotifications: vi.fn(),
// }));

let bell: Bell;
// let mockDialog: Dialog;

beforeEach(() => {
  // Initialize test environment
  TestEnvironment.initialize({
    // initOneSignalId: true,
    // initUserAndPushSubscription: true,
  });

  // Mock getAnimations method for DOM elements
  Element.prototype.getAnimations = vi.fn().mockReturnValue([]);

  // Create DOM elements for testing
  document.body.innerHTML = `
    <div id="onesignal-bell-container">
      <div class="onesignal-bell-launcher">
        <div class="onesignal-bell-launcher-dialog">
          <div class="onesignal-bell-launcher-dialog-body"></div>
        </div>
      </div>
    </div>
  `;

  // Create bell instance with enabled configuration
  bell = new Bell({
    enable: true,
    size: 'medium',
    position: 'bottom-right',
    theme: 'default',
  });

  // mockDialog = bell._dialog;
});

afterEach(() => {
  // Clean up DOM
  document.body.innerHTML = '';
  vi.resetAllMocks();
});

test.only('can open dialog', async () => {
  // Mock subscription manager to return unsubscribed state
  vi.spyOn(
    OneSignal.context._subscriptionManager,
    'isPushNotificationsEnabled',
  ).mockResolvedValue(false);

  // Set bell state to subscribed to enable dialog toggle
  bell._state = 'subscribed';

  // Initially dialog should not be shown
  expect(bell._dialog?._shown).toBe(false);

  // Test button click to open dialog (this should call _toggleDialog internally)
  await bell._button._onClick();

  // Dialog should now be shown
  expect(bell._dialog?._shown).toBe(true);
});

test('can close dialog', async () => {
  // Mock subscription manager
  vi.spyOn(
    OneSignal.context._subscriptionManager,
    'isPushNotificationsEnabled',
  ).mockResolvedValue(false);

  // Set bell state to subscribed to enable dialog toggle
  bell._state = 'subscribed';

  // First open the dialog by clicking button
  await bell._button._onClick();
  expect(bell._dialog?._shown).toBe(true);

  // Then close the dialog by clicking button again (toggle behavior)
  await bell._button._onClick();

  // Dialog should now be hidden
  expect(bell._dialog?._shown).toBe(false);
});

test('should not have race condition when toggling dialog', async () => {
  // Mock subscription manager
  vi.spyOn(
    OneSignal.context._subscriptionManager,
    'isPushNotificationsEnabled',
  ).mockResolvedValue(false);

  // Set bell state to subscribed to enable dialog toggle
  bell._state = 'subscribed';

  // Simulate rapid successive button clicks
  const promise1 = bell._button._onClick();
  const promise2 = bell._button._onClick();
  const promise3 = bell._button._onClick();

  // Wait for all promises to complete
  await Promise.all([promise1, promise2, promise3]);

  // Dialog should only be shown once (no race condition)
  expect(bell._dialog?._shown).toBe(true);

  // Verify that concurrent calls don't cause issues
  // The _showingDialog flag should prevent race conditions
  // We can't directly access the private property, but we can verify
  // that the dialog is in the expected state
});

// test('should call _activateIfInactive when opening dialog', async () => {
//   // Mock subscription manager
//   vi.spyOn(
//     OneSignal.context.subscriptionManager,
//     'isPushNotificationsEnabled',
//   ).mockResolvedValue(false);

//   // Set bell state to subscribed to enable dialog toggle
//   bell._state = 'subscribed';

//   // Initially launcher should be inactive
//   await bell._launcher._inactivate();
//   expect(
//     bell._launcher._element?.classList.contains(
//       'onesignal-bell-launcher-inactive',
//     ),
//   ).toBe(true);

//   // Mock _activateIfInactive to throw an error to verify it's called
//   const originalMethod = bell._launcher._activateIfInactive;
//   bell._launcher._activateIfInactive = vi.fn().mockImplementation(() => {
//     throw new Error('_activateIfInactive was called');
//   });

//   // Click button to open dialog - this should throw an error if _activateIfInactive is called
//   await expect(bell._button._onClick()).rejects.toThrow(
//     '_activateIfInactive was called',
//   );

//   // Restore original method
//   bell._launcher._activateIfInactive = originalMethod;
// });
