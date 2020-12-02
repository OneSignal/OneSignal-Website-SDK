import { SubscriptionStateKind } from 'src/models/SubscriptionStateKind';

export interface UpdatePlayerOptions {
    tags                        ?: Object | null;
    external_user_id_auth_hash  ?: string | null;
    identifier_auth_hash        ?: string | null;
    notification_types          ?: SubscriptionStateKind;
}