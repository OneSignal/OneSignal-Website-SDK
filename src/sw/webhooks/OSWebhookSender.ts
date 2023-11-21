import Database from '../../shared/services/Database';
import Log from '../libraries/Log';
import { IOSWebhookEventPayload } from './IOSWebhookEventPayload';

export class OSWebhookSender {
  async send(payload: IOSWebhookEventPayload): Promise<void> {
    const webhookTargetUrl = await Database.get<string>(
      'Options',
      `webhooks.${payload.event}`,
    );
    if (!webhookTargetUrl) return;

    const isServerCorsEnabled = await Database.get<boolean>(
      'Options',
      'webhooks.cors',
    );

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
