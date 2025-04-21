import { OPERATION_NAME } from '../constants';
import { BaseTagOperation } from './BaseTagOperation';

/**
 * An Operation to delete a tag from the OneSignal backend. The tag will
 * be associated to the user with the appId and onesignalId provided.
 */
export class DeleteTagOperation extends BaseTagOperation {
  constructor();
  constructor(appId: string, onesignalId: string, key: string);
  constructor(appId?: string, onesignalId?: string, key?: string) {
    super(OPERATION_NAME.DELETE_TAG, appId, onesignalId, key);
  }
}
