// Inside global.d.ts or src/types/tronweb.d.ts


import type { Provider } from '@metamask/providers';

declare global {
  interface Window {
    ethereum: Provider;
  }
}

declare module 'tronweb';