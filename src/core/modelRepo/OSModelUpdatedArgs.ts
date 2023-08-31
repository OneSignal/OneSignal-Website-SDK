import { OSModel } from './OSModel';

export class OSModelUpdatedArgs<Model> {
  constructor(
    public model: OSModel<Model>,
    public property: string,
    public oldValue: any,
    public newValue: any,
  ) {}
}
