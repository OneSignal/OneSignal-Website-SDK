export type SerializeReturnType = object | string | number | boolean;

export interface Serializable {
  serialize(): SerializeReturnType;
}
