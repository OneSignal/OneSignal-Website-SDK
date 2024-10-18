import OneSignalApiBaseResponse from '../../shared/api/OneSignalApiBaseResponse';
import OneSignalApiBase from '../../shared/api/OneSignalApiBase';
import { IdentityModel, SupportedIdentity } from '../models/IdentityModel';
import {
  FutureSubscriptionModel,
  SubscriptionModel,
} from '../models/SubscriptionModels';
import AliasPair from './AliasPair';
import { UpdateUserPayload } from './UpdateUserPayload';
import { CreateUserPayload } from './CreateUserPayload';
import { RequestMetadata } from '../models/RequestMetadata';
import { encodeRFC3986URIComponent } from '../../shared/utils/Encoding';
import OneSignalUtils from '../../shared/utils/OneSignalUtils';
import {
  SdkInitError,
  SdkInitErrorKind,
} from '../../shared/errors/SdkInitError';
import { addJwtHeader, addOneSignalSubscriptionIdHeader } from './helpers';

export class RequestService {
  /* U S E R   O P E R A T I O N S */

  /**
   * Creates a new user
   * @param requestMetadata - { appId, subscriptionId, jwtToken }
   * @param requestBody - The user's properties, identity, and subscriptions
   */
  static async createUser(
    requestMetadata: RequestMetadata,
    requestBody: CreateUserPayload,
  ): Promise<OneSignalApiBaseResponse> {
    const { appId, subscriptionId, jwtToken } = requestMetadata;

    const headers = new Headers();
    addOneSignalSubscriptionIdHeader(headers, subscriptionId);
    addJwtHeader(headers, jwtToken);

    requestBody['refresh_device_metadata'] = true;

    return OneSignalApiBase.post(`apps/${appId}/users`, requestBody, headers);
  }

  /**
   * Returns the user's properties, aliases, and subscriptions
   * @param requestMetadata - { appId, jwtToken }
   * @param alias - The user's alias
   * @returns - A promise that resolves with the user's properties, identity, and subscriptions
   */
  static async getUser(
    requestMetadata: RequestMetadata,
    alias: AliasPair,
  ): Promise<OneSignalApiBaseResponse> {
    const { appId, jwtToken } = requestMetadata;

    const headers = new Headers();
    addJwtHeader(headers, jwtToken);

    return OneSignalApiBase.get(
      `apps/${appId}/users/by/${alias.label}/${alias.id}`,
      headers,
    );
  }

  /**
   * Updates an existing user's properties
   *  - Aliases and subscriptions are managed via other endpoints
   * @param requestMetadata - { appId, subscriptionId, jwtToken }
   * @param alias - alias label & id
   * @param requestBody - update user payload
   * @returns no body
   */
  static async updateUser(
    requestMetadata: RequestMetadata,
    alias: AliasPair,
    requestBody: UpdateUserPayload,
  ): Promise<OneSignalApiBaseResponse> {
    const { appId, subscriptionId, jwtToken } = requestMetadata;
    if (!OneSignalUtils.isValidUuid(appId)) {
      throw new SdkInitError(SdkInitErrorKind.InvalidAppId);
    }

    const headers = new Headers();
    addOneSignalSubscriptionIdHeader(headers, subscriptionId);
    addJwtHeader(headers, jwtToken);

    const sanitizedAlias = {
      label: encodeRFC3986URIComponent(alias.label),
      id: encodeRFC3986URIComponent(alias.id),
    };

    return OneSignalApiBase.patch(
      `apps/${appId}/users/by/${sanitizedAlias.label}/${sanitizedAlias.id}`,
      requestBody,
      headers,
    );
  }

  /**
   * Removes the user identified by the given alias pair, and all subscriptions and aliases
   * @param requestMetadata - { appId, jwtToken }
   * @param alias - alias label & id
   */
  static async deleteUser(
    requestMetadata: RequestMetadata,
    alias: AliasPair,
  ): Promise<OneSignalApiBaseResponse> {
    const { appId, jwtToken } = requestMetadata;

    const headers = new Headers();
    addJwtHeader(headers, jwtToken);

    return OneSignalApiBase.delete(
      `apps/${appId}/users/by/${alias.label}/${alias.id}`,
      headers,
    );
  }

  /* I D E N T I T Y   O P E R A T I O N S */

  /**
   * Upserts one or more aliases for the user identified by the given alias pair
   * @param requestMetadata - { appId, jwtToken }
   * @param alias - alias label & id
   * @param identity - identity label & id
   */
  static async addAlias(
    requestMetadata: RequestMetadata,
    alias: AliasPair,
    identity: SupportedIdentity,
  ): Promise<OneSignalApiBaseResponse> {
    const { appId, jwtToken } = requestMetadata;

    const headers = new Headers();
    addJwtHeader(headers, jwtToken);

    return OneSignalApiBase.patch(
      `apps/${appId}/users/by/${alias.label}/${alias.id}/identity`,
      { identity },
      headers,
    );
  }

  /**
   * Lists all aliases for the user identified by the given alias pair
   * @param requestMetadata - { appId, jwtToken }
   * @param alias - alias label & id
   */
  static async getUserIdentity(
    requestMetadata: RequestMetadata,
    alias: AliasPair,
  ): Promise<OneSignalApiBaseResponse> {
    const { appId, jwtToken } = requestMetadata;

    const headers = new Headers();
    addJwtHeader(headers, jwtToken);

    return OneSignalApiBase.get(
      `apps/${appId}/users/by/${alias.label}/${alias.id}/identity`,
      headers,
    );
  }

  /**
   * Deletes an alias for the user identified by the given alias pair
   * @param requestMetadata - { appId, jwtToken }
   * @param alias - alias label & id
   * @param labelToRemove - label of identity to remove
   */
  static async deleteAlias(
    requestMetadata: RequestMetadata,
    alias: AliasPair,
    labelToRemove: string,
  ): Promise<OneSignalApiBaseResponse> {
    const { appId, jwtToken } = requestMetadata;

    const headers = new Headers();
    addJwtHeader(headers, jwtToken);

    return OneSignalApiBase.delete(
      `apps/${appId}/users/by/${alias.label}/${alias.id}/identity/${labelToRemove}`,
      headers,
    );
  }

  /* S U B S C R I P T I O N   O P E R A T I O N S */

  /**
   * Creates a new subscription for the user identified by the given alias pair
   * Useful to add email or SMS subscriptions to a user
   * @param requestMetadata - { appId, jwtToken }
   * @param alias - alias label & id
   * @param subscription - subscription label & id
   */
  static async createSubscription(
    requestMetadata: RequestMetadata,
    alias: AliasPair,
    subscription: { subscription: FutureSubscriptionModel },
  ): Promise<OneSignalApiBaseResponse> {
    const { appId, jwtToken } = requestMetadata;

    const headers = new Headers();
    addJwtHeader(headers, jwtToken);

    return OneSignalApiBase.post(
      `apps/${appId}/users/by/${alias.label}/${alias.id}/subscriptions`,
      subscription,
      headers,
    );
  }

  /**
   * Updates an existing Subscription’s properties.
   * @param requestMetadata - { appId, subscriptionId }
   * @param subscription - subscription object
   */
  static async updateSubscription(
    requestMetadata: RequestMetadata,
    subscription: Partial<SubscriptionModel>,
  ): Promise<OneSignalApiBaseResponse> {
    const { appId, subscriptionId } = requestMetadata;

    return OneSignalApiBase.patch(
      `apps/${appId}/subscriptions/${subscriptionId}`,
      { subscription },
    );
  }

  /**
   * Deletes the subscription.
   * Creates an "orphan" user record if the user has no other subscriptions.
   * @param requestMetadata - { appId, subscriptionId, jwtToken }
   */
  static async deleteSubscription(
    requestMetadata: RequestMetadata,
  ): Promise<OneSignalApiBaseResponse> {
    const { appId, subscriptionId, jwtToken } = requestMetadata;

    const headers = new Headers();
    addJwtHeader(headers, jwtToken);

    return OneSignalApiBase.delete(
      `apps/${appId}/subscriptions/${subscriptionId}`,
      headers,
    );
  }

  /**
   * Lists all aliases for the user identified by the given subscription id
   * @param requestMetadata - { appId, subscriptionId }
   */
  static async fetchAliasesForSubscription(
    requestMetadata: RequestMetadata,
  ): Promise<OneSignalApiBaseResponse> {
    const { appId, subscriptionId } = requestMetadata;

    return OneSignalApiBase.get(
      `apps/${appId}/subscriptions/${subscriptionId}/identity`,
    );
  }

  /**
   * Upserts one or more aliases for the user identified by the given subscription id
   * @param requestMetadata - { appId, subscriptionId }
   * @param identity - identity label & id
   */
  static async identifyUserForSubscription(
    requestMetadata: RequestMetadata,
    identity: IdentityModel,
  ): Promise<OneSignalApiBaseResponse> {
    const { appId, subscriptionId } = requestMetadata;

    return OneSignalApiBase.patch(
      `apps/${appId}/users/by/subscriptions/${subscriptionId}/identity`,
      { identity },
    );
  }

  /**
   * Transfers this Subscription to the User identified by the identity in the payload.
   * @param requestMetadata - { appId, subscriptionId }
   * @param identity - identity label & id
   * @param retainPreviousOwner - if true *AND* subscription is last subscription for the previous
   * user, an orphan user will be created. Otherwise, the previous user will be deleted. Useful when going
   * from a guest (anonymous) user to an identified user. If the previous owner had other subscriptions,
   * nothing will happen to the previous user.
   */
  static async transferSubscription(
    requestMetadata: RequestMetadata,
    identity: SupportedIdentity,
    retainPreviousOwner: boolean,
  ): Promise<OneSignalApiBaseResponse> {
    const { appId, subscriptionId } = requestMetadata;

    return OneSignalApiBase.patch(
      `apps/${appId}/subscriptions/${subscriptionId}/owner`,
      {
        identity: { ...identity },
        retain_previous_owner: retainPreviousOwner,
      },
    );
  }
}
