import { OSModel } from './OSModel';

// TODO: Remove this later as part of the Web SDK Refactor
export class OSModelUpdatedArgs<Model> {
  constructor(
    public model: OSModel<Model>,
    public property: string,
    public oldValue: unknown,
    public newValue: unknown,
  ) {}
}
