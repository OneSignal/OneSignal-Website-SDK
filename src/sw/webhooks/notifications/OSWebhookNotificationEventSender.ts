import { NotificationClickEvent } from "../../../shared/models/NotificationEvent";
import { OSWebhookSender } from "./../OSWebhookSender";

import { OSWebhookPayloadNotificationClick } from "./payloads/OSWebhookPayloadNotificationClick";
import { OSWebhookPayloadNotificationWillDisplay } from "./payloads/OSWebhookPayloadNotificationWillDisplay";
import { OSWebhookPayloadNotificationDismiss } from "./payloads/OSWebhookPayloadNotificationDismiss";
import { OSNotificationPayload } from "src/sw/models/OSNotificationPayload";

export class OSWebhookNotificationEventSender {
  constructor(
    private readonly sender: OSWebhookSender = new OSWebhookSender(),
  ) {}

  async click(event: NotificationClickEvent): Promise<void> {
    return await this.sender.send(new OSWebhookPayloadNotificationClick(event));
  }

  async willDisplay(notification: OSNotificationPayload): Promise<void> {
    return await this.sender.send(new OSWebhookPayloadNotificationWillDisplay(notification));
  }

  async dismiss(notification: OSNotificationPayload): Promise<void> {
    return await this.sender.send(new OSWebhookPayloadNotificationDismiss(notification));
  }
}
