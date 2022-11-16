import test from "ava";
import { DeliveryPlatformKind } from '../../../src/shared/models/DeliveryPlatformKind';


test(`delivery platform constants should be correct`, async t => {
  t.is(DeliveryPlatformKind.ChromeLike, 5);
  t.is(DeliveryPlatformKind.SafariLegacy, 7);
  t.is(DeliveryPlatformKind.Firefox, 8);
  t.is(DeliveryPlatformKind.Edge, 12);
});

