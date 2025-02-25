import { OSModel } from '../modelRepo/OSModel';

export interface StringIndexable<T> {
  [key: string]: OSModel<T>[];
}
