// test.nock = (responseBody: any, status = 200) => {
//   global.fetch = vi.fn().mockResolvedValue({
//     status,
//     json: vi.fn().mockResolvedValue(responseBody),
//   });

import { server } from './support/mocks/server';

// };
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
