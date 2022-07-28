// type TriggerValue = number | string;

import { Subscriptions } from "./Subscriptions";

export default interface IUser {
  // user model
  addAlias: (label: string, id: string) => void;
  addAliases: (aliases: {label: string, id: string}[]) => void;
  removeAlias: (label: string, id: string) => void;
  removeAliases: (aliases: {label: string, id: string}[]) => void;
  updateAlias: (label: string, id: string, newId: string) => void;

  // channels
  addEmail: (email: string) => void;
  addSms: (sms: string) => void;
  removeEmail: () => void;
  removeSms: () => void;

  // tags
  addTag: (key: string, value: string | number | boolean) => void;
  addTags: (tags: { key: string, value: string | number | boolean }[]) => void;
  removeTag: (tag: string) => void;
  removeTags: (tags: string[]) => void;

  // iam (TO DO)
  // addTrigger: (key: string, value: TriggerValue ) => void;
  // removeTrigger: (key: string) => void;
  // removeTriggers: (key: string[]) => void;

  // outcomes
  sendOutcome: (outcomeName: string, outcomeWeight?: number) => void;
  sendUniqueOutcome: (outcomeName: string) => void;

  // private
  subscriptions: Subscriptions;
}
