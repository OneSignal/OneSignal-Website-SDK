import { server } from './support/mocks/server';
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// set timezone
process.env.TZ = 'America/Los_Angeles';

global.isSecureContext = true;

Object.defineProperty(global, 'location', {
  value: new URL('https://localhost:3000'),
  writable: true,
});
