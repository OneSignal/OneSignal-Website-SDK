import { SerializableGeneric } from './Serializable';

export interface SecondaryChannelProfile {
  /**
   * The OneSignal playerId UUID provided by the OneSignal REST API when it is created
   */
  subscriptionId: string | null | undefined;
  /**
   * This is channel + platform specific identifier. Example: An email address or a push token
   */
  identifier: string | null | undefined;
  /**
   * The SHA-256 hash of the app's auth key and plain text identifier in hex format.
   */
  identifierAuthHash: string | null | undefined;
}

export interface SecondaryChannelProfileSerializable<BundleType>
  extends SecondaryChannelProfile,
    SerializableGeneric<BundleType> {
  serialize(): BundleType;
}
