export default class AliasPair {
  public label: string;
  public id: string;

  constructor(label: string, id: string) {
    this.label = label;
    this.id = id;
  }

  static ONESIGNAL_ID = 'onesignal_id';
  static EXTERNAL_ID = 'external_id';
}
