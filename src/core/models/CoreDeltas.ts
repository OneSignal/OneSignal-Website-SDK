import { OSModel } from '../modelRepo/OSModel';
import { CoreChangeType } from './CoreChangeType';
import { StringKeys } from './StringKeys';

export type ModelDelta<Model> = {
  model: OSModel<Model>;
  changeType: CoreChangeType;
};

export interface PropertyDelta<Model> extends ModelDelta<Model> {
  property: StringKeys<Model>;
  oldValue?: any;
  newValue: any;
}

export type CoreDelta<Model> = ModelDelta<Model> | PropertyDelta<Model>;
