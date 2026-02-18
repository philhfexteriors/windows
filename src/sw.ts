/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import { Serwist, NetworkOnly, type PrecacheEntry, type RuntimeCaching } from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[];
};

// Network-only for Supabase and Google auth — never cache or intercept these
const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ url }: { url: URL }) =>
      url.hostname.includes('supabase') ||
      url.hostname.includes('accounts.google.com') ||
      url.hostname.includes('googleapis.com'),
    handler: new NetworkOnly(),
  },
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
});

serwist.addEventListeners();
