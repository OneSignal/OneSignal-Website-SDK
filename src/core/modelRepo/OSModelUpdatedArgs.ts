import { OSModel } from './OSModel';

export class OSModelUpdatedArgs<Model> {
  constructor(
    public model: OSModel<Model>,
    public property: string,
    public oldValue: unknown,
    public newValue: unknown,
  ) {}
}
