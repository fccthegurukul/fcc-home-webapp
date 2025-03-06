/* eslint-disable no-restricted-globals */
import { precacheAndRoute } from 'workbox-precaching';

// Ye line Workbox ke manifest ke bina build hone se rokta hai
precacheAndRoute(self.__WB_MANIFEST);

// Version of the service worker (increase this when you update caching strategy)
const CACHE_NAME = 'my-app-cache-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/static/js/main.chunk.js', // Update these paths based on your build output
  '/static/css/main.chunk.css',
  // Add more assets you want to cache
];

// Install event - cache the essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    })
  );
  // Force the waiting service worker to become active immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    })
  );
  self.clients.claim(); // Immediately take control of all pages
});

// Fetch event - serve cached files if available, otherwise fetch from network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if found, otherwise fetch from network
      return response || fetch(event.request).then((networkResponse) => {
        // Cache the new response for future use
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});