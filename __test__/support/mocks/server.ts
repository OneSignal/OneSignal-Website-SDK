import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Default handlers survive server.resetHandlers(). Every init sends the
// feature flags request, so answer it with an empty list by default.
export const server = setupServer(
  http.get('**/sdk/features/web/*', () => HttpResponse.json({ features: [] })),
);
