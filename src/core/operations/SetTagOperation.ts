import { OPERATION_NAME } from '../constants';
import { BaseTagOperation } from './BaseTagOperation';

type TagOp = {
  value: Record<string, string>;
};

/**
 * An Operation to create/update a tag in the OneSignal backend. The tag will
 * be associated to the user with the appId and onesignalId provided.
 */
export class SetTagOperation extends BaseTagOperation<TagOp> {
  constructor();
  constructor(
    appId: string,
    onesignalId: string,
    key: string,
    value: Record<string, string>,
  );
  constructor(
    appId?: string,
    onesignalId?: string,
    key?: string,
    value?: Record<string, string>,
  ) {
    super(OPERATION_NAME.SET_TAG, appId, onesignalId, key);
    if (value) this.value = value;
  }

  /**
   * The new/updated tag value.
   */
  get value(): Record<string, string> {
    return this.getProperty('value');
  }
  private set value(value: Record<string, string>) {
    this.setProperty('value', value);
  }
}
