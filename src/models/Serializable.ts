export type SerializeReturnType = object | string | number | boolean;

export interface Serializable {
  serialize(): SerializeReturnType;
}

export interface SerializableGeneric<T> {
  serialize(): T;
}
