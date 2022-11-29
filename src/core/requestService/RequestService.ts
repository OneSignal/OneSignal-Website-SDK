import OneSignalApiBaseResponse from "../../shared/api/OneSignalApiBaseResponse";
import OneSignalError from "../../shared/errors/OneSignalError";
import OneSignalApiBase from "../../shared/api/OneSignalApiBase";
import { IdentityModel, SupportedIdentity } from "../models/IdentityModel";
import { FutureSubscriptionModel, SubscriptionModel } from "../models/SubscriptionModels";
import { isIdentityObject } from "../utils/typePredicates";
import AliasPair from "./AliasPair";
import { UpdateUserPayload } from "./UpdateUserPayload";
import UserData from "../models/UserData";
import { RequestMetadata } from "../models/RequestMetadata";

export class RequestService {
  /* U S E R   O P E R A T I O N S */

  /**
   * Creates a new user
   * @param requestMetadata - { appId }
   * @param requestBody - The user's properties, identity, and subscriptions
   */
  static createUser(requestMetadata: RequestMetadata, requestBody: UserData): Promise<OneSignalApiBaseResponse> {
    const { appId } = requestMetadata;
    return OneSignalApiBase.post(`${appId}/user`, requestBody);
  }

  /**
   * Returns the user's properties, aliases, and subscriptions
   * @param requestMetadata - { appId }
   * @param alias - The user's alias
   * @returns - A promise that resolves with the user's properties, identity, and subscriptions
   */
  static getUser(requestMetadata: RequestMetadata, alias: AliasPair): Promise<OneSignalApiBaseResponse> {
    const { appId } = requestMetadata;
    return OneSignalApiBase.get(`${appId}/user/by/${alias.label}/${alias.id}`);
  }

  /**
   * Updates an existing user's properties
   *  - Aliases and subscriptions are managed via other endpoints
   * @param requestMetadata - { appId }
   * @param alias - alias label & id
   * @param payload - update user payload
   * @returns no body
   */
  static updateUser(requestMetadata: RequestMetadata, alias: AliasPair, payload: UpdateUserPayload)
    : Promise<OneSignalApiBaseResponse>
    {
      const { appId, subscriptionId } = requestMetadata;
      const header = subscriptionId ? [{ "OneSignal-Subscription-Id": subscriptionId }] : undefined;
      return OneSignalApiBase.patch(`${appId}/user/by/${alias.label}/${alias.id}`, payload, header);
  }

  /**
   * Removes the user identified by the given alias pair, and all subscriptions and aliases
   * @param requestMetadata - { appId }
   * @param alias - alias label & id
   */
  static deleteUser(requestMetadata: RequestMetadata, alias: AliasPair): Promise<OneSignalApiBaseResponse> {
    const { appId } = requestMetadata;
    return OneSignalApiBase.delete(`${appId}/user/by/${alias.label}/${alias.id}`);
  }

  /* I D E N T I T Y   O P E R A T I O N S */

  /**
   * Upserts one or more aliases for the user identified by the given alias pair
   * @param requestMetadata - { appId }
   * @param alias - alias label & id
   * @param identity - identity label & id
   */
  static identifyUser(requestMetadata: RequestMetadata, alias: AliasPair, identity: SupportedIdentity)
    : Promise<OneSignalApiBaseResponse>
    {
      const { appId } = requestMetadata;
      return OneSignalApiBase.put(`${appId}/user/by/${alias.label}/${alias.id}/identity`, {
        identity
      });
  }

  /**
   * Lists all aliases for the user identified by the given alias pair
   * @param requestMetadata - { appId }
   * @param alias - alias label & id
   */
  static getUserIdentity(requestMetadata: RequestMetadata, alias: AliasPair): Promise<OneSignalApiBaseResponse> {
    const { appId } = requestMetadata;
    return OneSignalApiBase.get(`${appId}/user/by/${alias.label}/${alias.id}/identity`);
  }

  /**
   * Deletes an alias for the user identified by the given alias pair
   * @param requestMetadata - { appId }
   * @param alias - alias label & id
   * @param labelToRemove - label of identity to remove
   */
  static deleteAlias(requestMetadata: RequestMetadata, alias: AliasPair, labelToRemove: string)
  : Promise<OneSignalApiBaseResponse>
  {
    const { appId } = requestMetadata;
    const identity = OneSignalApiBase.delete(`${appId}/user/by/${alias.label}/${alias.id}/identity/${labelToRemove}`);

    if (isIdentityObject(identity)) {
      return identity;
    }
    throw new OneSignalError("`deleteAlias` returned an invalid identity object");
  }

  /* S U B S C R I P T I O N   O P E R A T I O N S */

  /**
   * Creates a new subscription for the user identified by the given alias pair
   * Useful to add email or SMS subscriptions to a user
   * @param requestMetadata - { appId }
   * @param alias - alias label & id
   * @param subscription - subscription label & id
   */
  static createSubscription(requestMetadata: RequestMetadata, alias: AliasPair, subscription: FutureSubscriptionModel):
    Promise<OneSignalApiBaseResponse> {
      // TO DO: remove temporary mock response
      return new Promise(resolve => {
        resolve({
          status: 200,
          result: {
            id: "11111111-1111-1111-1111-111111111111",
            ...subscription
          }
        });
      });

      const { appId } = requestMetadata;
      return OneSignalApiBase.post(`${appId}/user/by/${alias.label}/${alias.id}/subscription`, subscription);
  }


  /**
   * Updates an existing Subscription’s properties.
   * @param requestMetadata - { appId }
   * @param subscriptionId - subscription id
   * @param subscription - subscription object
   */
  static updateSubscription(
    requestMetadata: RequestMetadata,
    subscriptionId: string,
    subscription: Partial<SubscriptionModel>)
    : Promise<OneSignalApiBaseResponse> {
      const { appId } = requestMetadata;
      return OneSignalApiBase.patch(`${appId}/subscriptions/${subscriptionId}`, subscription);
  }

  /**
   * Deletes the subscription.
   * Creates an "orphan" user record if the user has no other subscriptions.
   * @param requestMetadata - { appId }
   * @param subscriptionId - subscription id
   */
  static deleteSubscription(requestMetadata: RequestMetadata, subscriptionId: string)
    : Promise<OneSignalApiBaseResponse> {
      const { appId } = requestMetadata;
      return OneSignalApiBase.delete(`${appId}/subscriptions/${subscriptionId}`);
  }

  /**
   * Lists all aliases for the user identified by the given subscription id
   * @param requestMetadata - { appId }
   * @param subscriptionId - subscription id
   */
  static fetchAliasesForSubscription(requestMetadata: RequestMetadata, subscriptionId: string)
    : Promise<OneSignalApiBaseResponse> {
      const { appId } = requestMetadata;
      return OneSignalApiBase.get(`${appId}/subscriptions/${subscriptionId}/identity`);
  }

  /**
   * Upserts one or more aliases for the user identified by the given subscription id
   * @param requestMetadata - { appId }
   * @param subscriptionId - subscription id
   * @param identity - identity label & id
   */
  static identifyUserForSubscription(requestMetadata: RequestMetadata, subscriptionId: string, identity: IdentityModel):
    Promise<OneSignalApiBaseResponse> {
      const { appId } = requestMetadata;
      return OneSignalApiBase.put(`${appId}/user/by/subscriptions/${subscriptionId}/identity`, identity);
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
  static transferSubscription(
    requestMetadata: RequestMetadata,
    subscriptionId: string,
    identity: SupportedIdentity,
    retainPreviousOwner: boolean): Promise<OneSignalApiBaseResponse> {
      const { appId } = requestMetadata;
      return OneSignalApiBase.put(`${appId}/subscriptions/${subscriptionId}/owner`, {
        identity,
        retain_previous_owner: retainPreviousOwner
      });
    }
}
