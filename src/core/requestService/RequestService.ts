import OneSignalApiBaseResult from "../../shared/api/OneSignalApiBaseResult";
import OneSignalError from "../../shared/errors/OneSignalError";
import OneSignalApiBase from "../../shared/api/OneSignalApiBase";
import { IdentityModel } from "../models/IdentityModel";
import { FutureSubscriptionModel, SubscriptionModel } from "../models/SubscriptionModels";
import { isIdentityObject } from "../utils/typePredicates";
import AliasPair from "./AliasPair";
import { UpdateUserPayload } from "./UpdateUserPayload";

export class RequestService {
  /* U S E R   O P E R A T I O N S */

  static async createUser(requestBody: UserData): Promise<OneSignalApiBaseResult | undefined> {
    return OneSignalApiBase.post(`user`, requestBody);
  }

  /**
   * Returns the user's properties, aliases, and subscriptions
   * @param alias - alias label & id
   * @returns user properties object, identity object, and subscription objects
   */
  static async getUser(alias: AliasPair): Promise<OneSignalApiBaseResult | undefined> {
    return OneSignalApiBase.get(`user/by/${alias.label}/${alias.id}`);
  }

  /**
   * Updates an existing user's properties
   *  - Aliases and subscriptions are managed via other endpoints
   * @param alias - alias label & id
   * @param refreshDeviceMetaData - if true, updates ip, country, & last active
   * @returns properties object
   */
  static updateUser(alias: AliasPair, payload: UpdateUserPayload): Promise<OneSignalApiBaseResult | undefined> {
    return OneSignalApiBase.patch(`user/by/${alias.label}/${alias.id}`, payload);
  }

  /**
   * Removes the user identified by the given alias pair, and all subscriptions and aliases
   * @param alias - alias label & id
   */
  static deleteUser(alias: AliasPair): Promise<OneSignalApiBaseResult | undefined> {
    return OneSignalApiBase.delete(`user/by/${alias.label}/${alias.id}`);
  }

  /* I D E N T I T Y   O P E R A T I O N S */

  /**
   * Upserts one or more aliases for the user identified by the given alias pair
   * @param alias - alias label & id
   * @param identity - identity object
   * @returns identity object
   */
  static async identifyUser(alias: AliasPair, identity: IdentityModel): Promise<OneSignalApiBaseResult | undefined> {
    return await OneSignalApiBase.put(`user/by/${alias.label}/${alias.id}/identity`, {
      identity
    });
  }

  /**
   * Lists all aliases for the user identified by the given alias pair
   * @param alias - alias label & id
   * @returns identity object
   */
  static async getUserIdentity(alias: AliasPair): Promise<OneSignalApiBaseResult | undefined> {
    return OneSignalApiBase.get(`user/by/${alias.label}/${alias.id}/identity`);
  }

  /**
   * Deletes an alias for the user identified by the given alias pair
   * @param alias - alias label & id
   * @param labelToRemove - alias label to remove
   * @returns identity object
   */
  static deleteAlias(alias: AliasPair, labelToRemove: string): Promise<OneSignalApiBaseResult | undefined> {
    const identity = OneSignalApiBase.delete(`user/by/${alias.label}/${alias.id}/identity/${labelToRemove}`);

    if (isIdentityObject(identity)) {
      return identity;
    }
    throw new OneSignalError("`deleteAlias` returned an invalid identity object");
  }

  /* S U B S C R I P T I O N   O P E R A T I O N S */

  /**
   * Creates a new subscription for the user identified by the given alias pair
   * Useful to add email or SMS subscriptions to a user
   * @param alias - alias label & id
   * @param subscription - subscription object
   * @returns subscription object
   */
  static createSubscription(alias: AliasPair, subscription: FutureSubscriptionModel):
    Promise<OneSignalApiBaseResult | undefined> {
      return OneSignalApiBase.post(`user/by/${alias.label}/${alias.id}/subscription`, subscription);
  }

  /**
   * Updates an existing Subscription’s properties.
   * @param subscriptionId - subscription id
   * @param subscription - partial or full subscription object
   * @returns subscription object
   */
  static updateSubscription(subscriptionId: string, subscription: Partial<SubscriptionModel>):
    Promise<OneSignalApiBaseResult | undefined> {
      return OneSignalApiBase.patch(`subscriptions/${subscriptionId}`, subscription);
  }

  /**
   * Deletes the subscription.
   * Creates an "orphan" user record if the user has no other subscriptions.
   * @param subscriptionId - subscription id
   */
  static deleteSubscription(subscriptionId: string): Promise<OneSignalApiBaseResult | undefined> {
    return OneSignalApiBase.delete(`subscriptions/${subscriptionId}`);
  }

  /**
   * Lists all aliases for the user identified by the given subscription id
   * @param subscriptionId - subscription id
   * @returns identity object
   */
  static fetchAliasesForSubscription(subscriptionId: string): Promise<OneSignalApiBaseResult | undefined> {
    return OneSignalApiBase.get(`subscriptions/${subscriptionId}/identity`);
  }

  /**
   * Upserts one or more aliases for the user identified by the given subscription id
   * @param subscriptionId - subscription id
   * @param identity - identity object
   * @returns identity object
   */
  static identifyUserForSubscription(subscriptionId: string, identity: IdentityModel):
    Promise<OneSignalApiBaseResult | undefined> {
      return OneSignalApiBase.put(`user/by/subscriptions/${subscriptionId}/identity`, identity);
  }

  /**
   * Transfers this Subscription to the User identified by the identity in the payload.
   * @param subscriptionId - subscription id
   * @param identity - identity object
   * @param retainPreviousOwner - if true *AND* subscription is last subscription for the previous
   * user, an orphan user will be created. Otherwise, the previous user will be deleted. Useful when going
   * from a guest (anonymous) user to an identified user. If the previous owner had other subscriptions,
   * nothing will happen to the previous user.
   * @returns identity object
   */
  static transferSubscription(
    subscriptionId: string,
    identity: IdentityModel,
    retainPreviousOwner: boolean): Promise<OneSignalApiBaseResult | undefined> {
      return OneSignalApiBase.put(`subscriptions/${subscriptionId}/owner`, {
        identity,
        retain_previous_owner: retainPreviousOwner
      });
    }
}
