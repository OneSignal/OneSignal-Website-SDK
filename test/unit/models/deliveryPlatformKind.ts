import test from "ava";
import Path from '../../../src/models/Path';
import { DeliveryPlatformKind } from '../../../src/models/DeliveryPlatformKind';


test(`delivery platform constants should be correct`, async t => {
  t.is(DeliveryPlatformKind.ChromeLike, 5);
  t.is(DeliveryPlatformKind.Safari, 7);
  t.is(DeliveryPlatformKind.Firefox, 8);
});

