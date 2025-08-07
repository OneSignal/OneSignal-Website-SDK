import { db } from 'src/shared/database/client';
import type { OptionKey } from 'src/shared/database/types';
import Log from 'src/shared/libraries/Log';
import type { IOSWebhookEventPayload } from '../serviceWorker/types';

export class OSWebhookSender {
  async send(payload: IOSWebhookEventPayload): Promise<void> {
    const webhookTargetUrl = (
      await db.get('Options', `webhooks.${payload.event}` as OptionKey)
    )?.value as string | undefined;
    if (!webhookTargetUrl) return;

    const isServerCorsEnabled = (await db.get('Options', 'webhooks.cors'))
      ?.value;

    const fetchOptions: RequestInit = {
      method: 'post',
      mode: 'no-cors',
      body: JSON.stringify(payload),
    };

    if (isServerCorsEnabled) {
      fetchOptions.mode = 'cors';
      fetchOptions.headers = {
        'X-OneSignal-Event': payload.event,
        'Content-Type': 'application/json',
      };
    }
    Log.debug(
      `Executing ${payload.event} webhook ${
        isServerCorsEnabled ? 'with' : 'without'
      } CORS POST ${webhookTargetUrl}`,
      payload,
    );
    await fetch(webhookTargetUrl, fetchOptions);
    return;
  }
}
