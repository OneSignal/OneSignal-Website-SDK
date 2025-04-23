import { SimpleModelStore } from 'src/shared/models/SimpleModelStore';
import { SingletonModelStore } from 'src/shared/models/SingletonModelStore';
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
