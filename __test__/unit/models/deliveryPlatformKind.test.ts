import { DeliveryPlatformKind } from "../../../src/shared/models/DeliveryPlatformKind";

describe('DeliveryPlatformKind', () => {
  test('delivery platform constants should be correct', async () => {
    expect(DeliveryPlatformKind.ChromeLike).toBe(5);
    expect(DeliveryPlatformKind.SafariLegacy).toBe(7);
    expect(DeliveryPlatformKind.Firefox).toBe(8);
    expect(DeliveryPlatformKind.Email).toBe(11);
    expect(DeliveryPlatformKind.Edge).toBe(12);
    expect(DeliveryPlatformKind.SMS).toBe(14);
    expect(DeliveryPlatformKind.SafariVapid).toBe(17);
  });
});
