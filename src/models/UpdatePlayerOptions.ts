import { SerializedPushDeviceRecord } from './PushDeviceRecord';
import { DeliveryPlatformKind } from './DeliveryPlatformKind';
import { SubscriptionStateKind } from 'src/models/SubscriptionStateKind';

export interface UpdatePlayerOptions {
    web_auth                    ?: string;
    web_p256                    ?: string;
    language                    ?: string;
    timezone                    ?: number;
    timezone_id                 ?: string;
    device_os                   ?: number;
    sdk                         ?: string;
    device_model                ?: string;
    app_id                      ?: string;
    tags                        ?: Object | null;
    external_user_id            ?: string;
    external_user_id_auth_hash  ?: string;
    identifier_auth_hash        ?: string | null;
    email                       ?: string | null;
    parent_player_id            ?: string | null;
    identifier                  ?: string | null;
    device_type                 ?: DeliveryPlatformKind;
    notification_types          ?: SubscriptionStateKind | undefined;
}

export interface UpdatePlayerExternalUserId extends UpdatePlayerOptions {
  external_user_id: string; // Use "" to remove id from onesignal.com backend.
  external_user_id_auth_hash?: string;
}
