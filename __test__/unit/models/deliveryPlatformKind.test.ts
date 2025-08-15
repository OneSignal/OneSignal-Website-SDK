import { DeliveryPlatformKind } from '../../../src/shared/models/DeliveryPlatformKind';

describe('DeliveryPlatformKind', () => {
  test('delivery platform constants should be correct', async () => {
    expect(DeliveryPlatformKind.ChromeLike).toBe(5);
    expect(DeliveryPlatformKind.SafariLegacy).toBe(7);
    expect(DeliveryPlatformKind.Firefox).toBe(8);
  });
});
