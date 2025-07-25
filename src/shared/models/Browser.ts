export const Browser = {
  Safari: 'safari',
  Firefox: 'firefox',
  Chrome: 'chrome',
  Opera: 'opera',
  Edge: 'edge',
  Other: 'other',
} as const;

export type BrowserValue = (typeof Browser)[keyof typeof Browser];
