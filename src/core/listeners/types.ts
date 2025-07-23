import type { Model } from '../models/Model';
import type {
  IEventNotifier,
  ISingletonModelStoreChangeHandler,
} from '../types/models';

export interface ISingletonModelStore<TModel extends Model>
  extends IEventNotifier<ISingletonModelStoreChangeHandler<TModel>> {
  /**
   * The model managed by this singleton model store.
   */
  readonly model: TModel;

  /**
   * Replace the existing model with the new model provided.
   *
   * @param model A model that contains all the data for the new effective model.
   * @param tag The tag which identifies how/why the model is being replaced.
   */
  replace(model: TModel, tag?: string): void;
}
