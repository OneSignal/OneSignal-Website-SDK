export interface MessengerMessageEvent {
  id: string;
  command: string;
  data: any;
  source: string;
  reply: Function;
}
