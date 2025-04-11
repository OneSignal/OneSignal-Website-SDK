import { Model } from 'src/core/modelRepo/Model';
import { ModelStore } from 'src/core/modelRepo/ModelStore';
import { IPreferencesService } from 'src/types/preferences';

/**
 * A simple model store is a concrete implementation of the ModelStore,
 * which provides a basic create() method using the passed-in factory.
 */
export class SimpleModelStore<TModel extends Model> extends ModelStore<TModel> {
  private readonly _create: () => TModel;

  /**
   * @param _create A factory function used to instantiate a new model instance.
   * @param name Optional name for persistence.
   * @param _prefs Optional preferences service for persistence support.
   */
  constructor(
    _create: () => TModel,
    name?: string,
    _prefs?: IPreferencesService,
  ) {
    super(name, _prefs);
    this._create = _create;
    this.load(); // Automatically load on construction
  }

  override create(jsonObject?: object): TModel {
    const model = this._create();
    if (jsonObject != null) {
      model.initializeFromJson(jsonObject);
    }
    return model;
  }
}
