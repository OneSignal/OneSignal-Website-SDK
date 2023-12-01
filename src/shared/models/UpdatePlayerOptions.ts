import { DeliveryPlatformKind } from './DeliveryPlatformKind';
import { SubscriptionStateKind } from '../../shared/models/SubscriptionStateKind';

export interface UpdatePlayerOptions {
  web_auth?: string;
  web_p256?: string;
  language?: string;
  timezone?: number;
  timezone_id?: string;
  device_os?: number;
  sdk?: string;
  device_model?: string;
  app_id?: string;
  tags?: Record<string, string> | null;
  identifier_auth_hash?: string | null;
  email?: string | null;
  parent_player_id?: string | null;
  identifier?: string | null;
  device_type?: DeliveryPlatformKind;
  notification_types?: SubscriptionStateKind | undefined;
}
