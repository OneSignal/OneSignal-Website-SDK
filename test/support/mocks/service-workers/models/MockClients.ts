export class MockClients implements Clients {
  private readonly clients: Array<Client>;

  constructor() {
    this.clients = [];
  }

  get(id: string): Promise<any> {
    const client = this.clients.find(cli => id === cli.id);
    return Promise.resolve(client || null);
  }

  async matchAll<T extends ClientQueryOptions>(options?: T): Promise<ReadonlyArray<T["type"] extends "window" ? WindowClient : Client>> {
    return Object.freeze(this.clients) as ReadonlyArray<T["type"] extends "window" ? WindowClient : Client>;
  }

  async openWindow(_url: string): Promise<WindowClient | null> {
    return null;
  }

  async claim(): Promise<void> {
    return;
  }

}
