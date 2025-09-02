import { getOptionsValue } from 'src/shared/database/client';
import type { OptionKey } from 'src/shared/database/types';
import Log from 'src/shared/libraries/Log';
import type { IOSWebhookEventPayload } from '../serviceWorker/types';

export class OSWebhookSender {
  async send(payload: IOSWebhookEventPayload): Promise<void> {
    const webhookTargetUrl = await getOptionsValue<string>(
      `webhooks.${payload.event}` as OptionKey,
    );
    if (!webhookTargetUrl) return;

    const isServerCorsEnabled = await getOptionsValue<boolean>('webhooks.cors');

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
    Log._debug(
      `Executing ${payload.event} webhook ${
        isServerCorsEnabled ? 'with' : 'without'
      } CORS POST ${webhookTargetUrl}`,
      payload,
    );
    await fetch(webhookTargetUrl, fetchOptions);
    return;
  }
}
