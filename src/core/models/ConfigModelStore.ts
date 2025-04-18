import { SimpleModelStore } from 'src/shared/models/SimpleModelStore';
import { SingletonModelStore } from 'src/shared/models/SingletonModelStore';
import { IPreferencesService } from 'src/types/preferences';
import { ConfigModel } from './ConfigModel';

export class ConfigModelStore extends SingletonModelStore<ConfigModel> {
  constructor(prefs: IPreferencesService) {
    super(
      new SimpleModelStore<ConfigModel>(
        () => new ConfigModel(),
        'config',
        prefs,
      ),
    );
  }
}
