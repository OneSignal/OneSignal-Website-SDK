import { OSModelStore } from '../modelRepo/OSModelStore';
import { FutureIdentityModel, IdentityModel, SupportedIdentity } from './IdentityModel';
import { FutureSubscriptionModel, SubscriptionModel } from './SubscriptionModels';
import { ModelName, OSModelType, SupportedModel } from './SupportedModels';
import { UserPropertiesModel } from './UserPropertiesModel';




// Use this OSModelType<T> over OSModel<T> if T = type union.
//  - This is needed to pass strictFunctionTypes=true.
// Example: Use OSModelType<TypeA | TypeB> instead of OSModel<TypeA | TypeB>
// See: https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
// export type OSModelType<T> = T extends object ? OSModel<T> : never;



// export enum ModelName {
//   Identity = 'identity',
//   Properties = 'properties',
//   // TO DO: make singular
//   PushSubscriptions = 'pushSubscriptions',
//   EmailSubscriptions = 'emailSubscriptions',
//   SmsSubscriptions = 'smsSubscriptions',
// }

// export type SupportedModel =
//   | SupportedIdentity
//   | UserPropertiesModel
//   | SupportedSubscription;



// type ModelStoresMapMap = {
//   Identity: OSModelStore<SupportedIdentity>;
//   PushSubscriptions: OSModelStore<SubscriptionModel>
// }

// NotificationEventTypeMap[K]

// export type ModelStoresMap<T> = T extends object ? {
//     // TO DO: try to restrict keys more
//     [key in ModelStoresMapMap]: OSModelStore<T>
// } : never;


// 1. Could work, but needs the key to be the string value
// export type ModelStoresMap<T extends SupportedModel> = {
//   Identity?: OSModelStore<SupportedIdentity>;
//   PushSubscriptions?: OSModelStore<SubscriptionModel>
// }

// 1.1 Example of possibly pulling this off?
// enum InlineStyle {
//   "Bold" = "isBold",
//   "Italic" = "isItalic",
//   "Underline" = "isUnderlined"
// }

// type InlineStyleType = Record<InlineStyle, boolean>

// enum ListStyle {
//  "UL",
//  "OL"
// }

// type LS keyof typeof ListStyle

// interface HTMLBlock extends InlineStyleType {
//  // This has extended with
//  // isBold: boolean
//  // isItalic: boolean
//  // isUnderlined: boolean

//  listType: LS
// }

export interface ModelStoresMap { // <T extends SupportedModel> {
  // TODO: These could be missing
  identity: OSModelStore<FutureIdentityModel> & OSModelStore<IdentityModel>;  // TODO: Consider the Future types like Sub models below?
  properties: OSModelStore<UserPropertiesModel>;
  pushSubscriptions: OSModelStore<SubscriptionModel> & OSModelStore<FutureSubscriptionModel>; // TODO: Add this too? | OSModelStore<FutureSubscriptionModel>
  emailSubscriptions: OSModelStore<SubscriptionModel> & OSModelStore<FutureSubscriptionModel>;
  smsSubscriptions: OSModelStore<SubscriptionModel> & OSModelStore<FutureSubscriptionModel>;
}

export type ModelStoresMapMapValues =
'identity' |
'properties' |
'pushSubscriptions' |
'emailSubscriptions' |
'smsSubscriptions';

// This can be used with functions
// TODO: Better name
export type ModelStoresMapMap = {
  identity: OSModelType<FutureIdentityModel> | OSModelType<IdentityModel>;  // TODO: Consider the Future types like Sub models below?
  properties: OSModelType<UserPropertiesModel>;
  pushSubscriptions: OSModelType<SubscriptionModel> | OSModelType<FutureSubscriptionModel>; // TODO: Add this too? | OSModelStore<FutureSubscriptionModel>
  emailSubscriptions: OSModelType<SubscriptionModel> | OSModelType<FutureSubscriptionModel>;
  smsSubscriptions: OSModelType<SubscriptionModel> | OSModelType<FutureSubscriptionModel>;
};


// Seems to & each type, which isn't what we want.
// export type ModelStoresMap<T> = T extends object ? {
//   // TO DO: try to restrict keys more
//   [key in ModelName]: OSModelStore<T>;
// } : never;

// Original code
// export type ModelStoresMap<Model> = {
//   // TO DO: try to restrict keys more
//   [key in ModelName]: OSModelStore<Model>;
// };


