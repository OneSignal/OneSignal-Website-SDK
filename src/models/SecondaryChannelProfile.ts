import { SerializableGeneric } from "./Serializable";

export abstract class SecondaryChannelProfile {
 /**
  * The OneSignal playerId UUID provided by the OneSignal REST API when it is created
  */
 public playerId: string | null | undefined;
 /**
  * This is channel + platform specific identifier. Example: An email address or a push token
  */
 public identifier: string | null | undefined;
 /**
  * The SHA-256 hash of the app's auth key and plain text identifier in hex format.
  */
 public identifierAuthHash: string | null | undefined;
}

export abstract class SecondaryChannelProfileSerializable<BundleType> extends SecondaryChannelProfile implements SerializableGeneric<BundleType> {
 abstract serialize(): BundleType;
}
