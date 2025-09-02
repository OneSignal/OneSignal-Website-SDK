export type SerializeReturnType = object | string | number | boolean;

export interface Serializable {
  _serialize(): SerializeReturnType;
}
