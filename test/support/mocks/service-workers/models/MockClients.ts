export class MockClients implements Clients {
  private readonly clients: Array<Client>;

  constructor() {
    this.clients = [];
  }

  get(id: string): Promise<any> {
    const client = this.clients.find(cli => id === cli.id);
    return Promise.resolve(client || null);
  }

  async matchAll(_options?: ClientQueryOptions): Promise<Client[]> {
    return this.clients;
  }

  async openWindow(_url: string): Promise<WindowClient | null> {
    return null;
  }

  async claim(): Promise<void> {
    return;
  }

}
