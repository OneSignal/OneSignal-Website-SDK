import OneSignalApiBase from '../../shared/api/OneSignalApiBase';
import OneSignalApiBaseResponse from '../../shared/api/OneSignalApiBaseResponse';
import {
  SdkInitError,
  SdkInitErrorKind,
} from '../../shared/errors/SdkInitError';
import { encodeRFC3986URIComponent } from '../../shared/utils/Encoding';
import OneSignalUtils from '../../shared/utils/OneSignalUtils';
import { IdentityModel } from '../models/IdentityModel';
import {
  ICreateUser,
  ICreateUserIdentity,
  ICreateUserSubscription,
  ISubscription,
  IUpdateUser,
  IUserIdentity,
  IUserProperties,
  RequestMetadata,
  UserData,
} from '../types/api';
import { ICustomEventRequest, ICustomEventRequestItem } from '../types/events';
import AliasPair from './AliasPair';

export class RequestService {
  /* U S E R   O P E R A T I O N S */

  /**
   * Creates a new user
   * @param requestMetadata - { appId }
   * @param requestBody - The user's properties, identity, and subscriptions
   */
  static async createUser(
    requestMetadata: RequestMetadata,
    requestBody: ICreateUser,
  ) {
    const { appId, subscriptionId } = requestMetadata;

    const subscriptionHeader = subscriptionId
      ? { 'OneSignal-Subscription-Id': subscriptionId }
      : undefined;

    let headers = {};

    if (subscriptionHeader) {
      headers = { ...headers, ...subscriptionHeader };
    }

    if (requestMetadata.jwtHeader) {
      headers = { ...headers, ...requestMetadata.jwtHeader };
    }

    requestBody['refresh_device_metadata'] = true;

    return OneSignalApiBase.post<UserData>(
      `apps/${appId}/users`,
      requestBody,
      headers,
    );
  }

  /**
   * Returns the user's properties, aliases, and subscriptions
   * @param requestMetadata - { appId }
   * @param alias - The user's alias
   * @returns - A promise that resolves with the user's properties, identity, and subscriptions
   */
  static async getUser(requestMetadata: RequestMetadata, alias: AliasPair) {
    const { appId } = requestMetadata;
    return OneSignalApiBase.get<UserData>(
      `apps/${appId}/users/by/${alias.label}/${alias.id}`,
      requestMetadata.jwtHeader,
    );
  }

  /**
   * Updates an existing user's properties
   *  - Aliases and subscriptions are managed via other endpoints
   * @param requestMetadata - { appId }
   * @param alias - alias label & id
   * @param payload - update user payload
   * @returns no body
   */
  static async updateUser(
    requestMetadata: RequestMetadata,
    alias: AliasPair,
    payload: IUpdateUser,
  ) {
    const { appId, subscriptionId } = requestMetadata;
    if (!OneSignalUtils.isValidUuid(appId)) {
      throw new SdkInitError(SdkInitErrorKind.InvalidAppId);
    }

    const subscriptionHeader = subscriptionId
      ? { 'OneSignal-Subscription-Id': subscriptionId }
      : undefined;

    let headers = {};

    if (subscriptionHeader) {
      headers = { ...headers, ...subscriptionHeader };
    }

    if (requestMetadata.jwtHeader) {
      headers = { ...headers, ...requestMetadata.jwtHeader };
    }

    const sanitizedAlias = {
      label: encodeRFC3986URIComponent(alias.label),
      id: encodeRFC3986URIComponent(alias.id),
    };

    return OneSignalApiBase.patch<{ properties: IUserProperties }>(
      `apps/${appId}/users/by/${sanitizedAlias.label}/${sanitizedAlias.id}`,
      payload,
      headers,
    );
  }

  /**
   * Removes the user identified by the given alias pair, and all subscriptions and aliases
   * @param requestMetadata - { appId }
   * @param alias - alias label & id
   */
  static async deleteUser(
    requestMetadata: RequestMetadata,
    alias: AliasPair,
  ): Promise<OneSignalApiBaseResponse> {
    const { appId } = requestMetadata;
    return OneSignalApiBase.delete(
      `apps/${appId}/users/by/${alias.label}/${alias.id}`,
      requestMetadata.jwtHeader,
    );
  }

  /* I D E N T I T Y   O P E R A T I O N S */

  /**
   * Upserts one or more aliases for the user identified by the given alias pair
   * @param requestMetadata - { appId }
   * @param alias - alias label & id
   * @param identity - identity label & id
   */
  static async addAlias(
    requestMetadata: RequestMetadata,
    alias: AliasPair,
    identity: ICreateUserIdentity,
  ) {
    const { appId } = requestMetadata;
    return OneSignalApiBase.patch<{ identity: IUserIdentity }>(
      `apps/${appId}/users/by/${alias.label}/${alias.id}/identity`,
      { identity },
      requestMetadata.jwtHeader,
    );
  }

  /**
   * Lists all aliases for the user identified by the given alias pair
   * @param requestMetadata - { appId }
   * @param alias - alias label & id
   */
  static async getUserIdentity(
    requestMetadata: RequestMetadata,
    alias: AliasPair,
  ): Promise<OneSignalApiBaseResponse> {
    const { appId } = requestMetadata;
    return OneSignalApiBase.get<{ identity: IUserIdentity }>(
      `apps/${appId}/users/by/${alias.label}/${alias.id}/identity`,
      requestMetadata.jwtHeader,
    );
  }

  /**
   * Deletes an alias for the user identified by the given alias pair
   * @param requestMetadata - { appId }
   * @param alias - alias label & id
   * @param labelToRemove - label of identity to remove
   */
  static async deleteAlias(
    requestMetadata: RequestMetadata,
    alias: AliasPair,
    labelToRemove: string,
  ) {
    const { appId } = requestMetadata;
    return OneSignalApiBase.delete<{ identity: IUserIdentity }>(
      `apps/${appId}/users/by/${alias.label}/${alias.id}/identity/${labelToRemove}`,
      requestMetadata.jwtHeader,
    );
  }

  /* S U B S C R I P T I O N   O P E R A T I O N S */

  /**
   * Creates a new subscription for the user identified by the given alias pair
   * Useful to add email or SMS subscriptions to a user
   * @param requestMetadata - { appId }
   * @param alias - alias label & id
   * @param subscription - subscription label & id
   */
  static async createSubscription(
    requestMetadata: RequestMetadata,
    alias: AliasPair,
    subscription: { subscription: ICreateUserSubscription },
  ) {
    const { appId } = requestMetadata;
    return OneSignalApiBase.post<{ subscription?: ISubscription }>(
      `apps/${appId}/users/by/${alias.label}/${alias.id}/subscriptions`,
      subscription,
      requestMetadata.jwtHeader,
    );
  }

  /**
   * Updates an existing Subscription’s properties.
   * @param requestMetadata - { appId }
   * @param subscriptionId - subscription id
   * @param subscription - subscription object
   */
  static async updateSubscription(
    requestMetadata: RequestMetadata,
    subscriptionId: string,
    subscription: ICreateUserSubscription,
  ) {
    const { appId } = requestMetadata;
    return OneSignalApiBase.patch<{
      subscription: ISubscription;
    }>(`apps/${appId}/subscriptions/${subscriptionId}`, { subscription });
  }

  /**
   * Deletes the subscription.
   * Creates an "orphan" user record if the user has no other subscriptions.
   * @param requestMetadata - { appId }
   * @param subscriptionId - subscription id
   */
  static async deleteSubscription(
    requestMetadata: RequestMetadata,
    subscriptionId: string,
  ) {
    const { appId } = requestMetadata;
    return OneSignalApiBase.delete<{ subscription: ISubscription }>(
      `apps/${appId}/subscriptions/${subscriptionId}`,
    );
  }

  /**
   * Lists all aliases for the user identified by the given subscription id
   * @param requestMetadata - { appId }
   * @param subscriptionId - subscription id
   */
  static async getIdentityFromSubscription(
    requestMetadata: RequestMetadata,
    subscriptionId: string,
  ) {
    const { appId } = requestMetadata;
    return OneSignalApiBase.get<{ identity: IUserIdentity }>(
      `apps/${appId}/subscriptions/${subscriptionId}/user/identity`,
    );
  }

  /**
   * Upserts one or more aliases for the user identified by the given subscription id
   * @param requestMetadata - { appId }
   * @param subscriptionId - subscription id
   * @param identity - identity label & id
   */
  static async identifyUserForSubscription(
    requestMetadata: RequestMetadata,
    subscriptionId: string,
    identity: IdentityModel,
  ): Promise<OneSignalApiBaseResponse> {
    const { appId } = requestMetadata;
    return OneSignalApiBase.patch<{ identity: IUserIdentity }>(
      `apps/${appId}/users/by/subscriptions/${subscriptionId}/identity`,
      { identity },
      requestMetadata.jwtHeader,
    );
  }

  /**
   * Transfers this Subscription to the User identified by the identity in the payload.
   * @param requestMetadata - { appId }
   * @param subscriptionId - subscription id
   * @param identity - identity label & id
   * @param retainPreviousOwner - if true *AND* subscription is last subscription for the previous
   * user, an orphan user will be created. Otherwise, the previous user will be deleted. Useful when going
   * from a guest (anonymous) user to an identified user. If the previous owner had other subscriptions,
   * nothing will happen to the previous user.
   */
  static async transferSubscription(
    requestMetadata: RequestMetadata,
    subscriptionId: string,
    identity: IUserIdentity,
    retainPreviousOwner: boolean,
  ) {
    const { appId } = requestMetadata;
    return OneSignalApiBase.patch<{ identity: IUserIdentity }>(
      `apps/${appId}/subscriptions/${subscriptionId}/owner`,
      {
        identity: { ...identity },
        retain_previous_owner: retainPreviousOwner,
      },
      requestMetadata.jwtHeader,
    );
  }

  // Custom Events
  static async sendCustomEvent(
    requestMetadata: RequestMetadata,
    customEvent: ICustomEventRequestItem,
  ) {
    const { appId } = requestMetadata;
    return OneSignalApiBase.post<{ identity: IUserIdentity }>(
      `apps/${appId}/integrations/custom_events`,
      { events: [customEvent] } satisfies ICustomEventRequest,
      requestMetadata.jwtHeader,
    );
  }
}
