export default class AliasPair {
  constructor(
    readonly label: string,
    readonly id: string,
  ) {}

  static ONESIGNAL_ID = 'onesignal_id';
  static EXTERNAL_ID = 'external_id';
}
