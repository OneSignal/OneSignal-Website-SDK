/**
 * Purpose: Keeps track of IDs that were just created on the backend.
 * This list gets used to delay network calls to ensure upcoming
 * requests are ready to be accepted by the backend.
 */
export class NewRecordsState {
  // time in ms
  OP_REPO_POST_CREATE_DELAY: number;
  // Key = a string id
  // Value = A Timestamp in ms of when the id was created
  private records: Map<string, number> = new Map();

  constructor(time = 3000) {
    this.OP_REPO_POST_CREATE_DELAY = time;
  }

  public add(key: string, overwrite = false): void {
    if (overwrite || this.records.get(key)) {
      this.records.set(key, Date.now());
    }
  }

  public canAccess(key: string): boolean {
    const timeLastMovedOrCreated = this.records.get(key);
    return timeLastMovedOrCreated
      ? Date.now() - timeLastMovedOrCreated > this.OP_REPO_POST_CREATE_DELAY
      : true;
  }
}
