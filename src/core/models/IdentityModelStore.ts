import { SimpleModelStore } from '../../shared/models/SimpleModelStore';
import { SingletonModelStore } from '../../shared/models/SingletonModelStore';
import { IPreferencesService } from '../../types/preferences';
import { IdentityModel } from './IdentityModel';

/**
 * A model store for the Identity model
 */
export class IdentityModelStore extends SingletonModelStore<IdentityModel> {
  constructor(prefs: IPreferencesService) {
    super(new SimpleModelStore(() => new IdentityModel(), 'identity', prefs));
  }
}
