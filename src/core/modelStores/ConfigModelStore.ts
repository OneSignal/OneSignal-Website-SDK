import { SimpleModelStore } from 'src/core/models/SimpleModelStore';
import { SingletonModelStore } from 'src/core/models/SingletonModelStore';
import { ConfigModel } from '../models/ConfigModel';
import { ModelName } from '../types/models';

export class ConfigModelStore extends SingletonModelStore<ConfigModel> {
  constructor() {
    super(
      new SimpleModelStore<ConfigModel>(
        () => new ConfigModel(),
        ModelName.Config,
      ),
    );
  }
}
