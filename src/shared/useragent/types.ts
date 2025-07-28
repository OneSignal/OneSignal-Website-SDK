import type { Browser } from './constants';

export type BrowserValue = (typeof Browser)[keyof typeof Browser];
