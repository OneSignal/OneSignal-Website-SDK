import { setupServer } from 'msw/node';

// we call server.listen() in setupTests.ts
export const server = setupServer();
