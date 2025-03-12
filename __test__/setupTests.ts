import { server } from './support/mocks/server';
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

global.isSecureContext = true;

Object.defineProperty(global, 'location', {
  value: new URL('https://localhost:3000'),
  writable: true,
});
