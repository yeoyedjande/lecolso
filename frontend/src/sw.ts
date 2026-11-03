/// <reference lib="webworker" />
import { createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'

declare const self: ServiceWorkerGlobalScope

// Assets du build (JS, CSS, HTML) injectés par vite-plugin-pwa : cache d'abord
precacheAndRoute(self.__WB_MANIFEST)

// Application monopage : toute navigation sert index.html depuis le cache
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

const apiUrl = new URL(import.meta.env.VITE_API_URL)

// API : réseau d'abord (3G instable), réponse en cache si le réseau échoue ou tarde.
// Uniquement les GET : les écritures hors connexion passent par la file Dexie (lib/offline).
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    url.origin === apiUrl.origin &&
    url.pathname.startsWith(apiUrl.pathname),
  new NetworkFirst({ cacheName: 'api', networkTimeoutSeconds: 5 }),
)

// Images et polices hors precache : cache d'abord
registerRoute(
  ({ request }) => request.destination === 'image' || request.destination === 'font',
  new CacheFirst({ cacheName: 'assets' }),
)

void self.skipWaiting()
