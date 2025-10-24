import { getOptionsValue } from 'src/shared/database/client';
import type { OptionKey } from 'src/shared/database/types';
import { debug } from 'src/shared/libraries/log';
import type { IOSWebhookEventPayload } from '../serviceWorker/types';

export async function send(payload: IOSWebhookEventPayload): Promise<void> {
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
  debug(
    `Executing ${payload.event} webhook ${
      isServerCorsEnabled ? 'with' : 'without'
    } CORS POST ${webhookTargetUrl}`,
    payload,
  );
  await fetch(webhookTargetUrl, fetchOptions);
  return;
}
