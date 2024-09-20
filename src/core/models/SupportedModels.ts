import { OSModel } from '../modelRepo/OSModel';
import { SupportedIdentity } from './IdentityModel';
import { SupportedSubscription } from './SubscriptionModels';
import { UserPropertiesModel } from './UserPropertiesModel';

export enum ModelName {
  Identity = 'identity',
  Properties = 'properties',
  // TO DO: make singular
  PushSubscriptions = 'pushSubscriptions',
  EmailSubscriptions = 'emailSubscriptions',
  SmsSubscriptions = 'smsSubscriptions',
}

export type SupportedModel =
  | SupportedIdentity
  | UserPropertiesModel
  | SupportedSubscription;


// Use this OSModelType<T> over OSModel<T> if T = type union.
//  - This is needed to pass strictFunctionTypes=true.
// Example: Use OSModelType<TypeA | TypeB> instead of OSModel<TypeA | TypeB>
// See: https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
export type OSModelType<T> = T extends object ? OSModel<T> : never;
