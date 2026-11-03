/// <reference lib="webworker" />
import { createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'

declare const self: ServiceWorkerGlobalScope

// Assets du build (JS, CSS, HTML) injectés par vite-plugin-pwa : cache d'abord
precacheAndRoute(self.__WB_MANIFEST)

// Application monopage : toute navigation sert index.html depuis le cache
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// API : AUCUNE réponse en cache (données personnelles). Le hors connexion passe uniquement par Dexie
// (lib/offline) ; les requêtes vers l'API vont toujours au réseau.

// Images et polices de l'application elle-même (même origine) : cache d'abord. Jamais les fichiers servis
// par des URL signées (photos d'élèves, pièces jointes), qui viennent d'une autre origine.
registerRoute(
  ({ url, request }) =>
    url.origin === self.location.origin &&
    (request.destination === 'image' || request.destination === 'font'),
  new CacheFirst({ cacheName: 'assets' }),
)

void self.skipWaiting()
