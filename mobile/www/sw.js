/**
 * Sound Sentinel Pro - Mobile Service Worker
 * Enables 100% offline edge acoustic classification on iOS & Android
 * Afro Vision Media PTY (Ltd)
 */

const CACHE_NAME = 'sound-sentinel-v1.0.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/mobile.css',
  './js/classes.js',
  './js/mobile-audio.js',
  './js/mobile-classifier.js',
  './js/mobile-dispatcher.js',
  './js/mobile-app.js',
  './assets/afrovision_logo.png',
  './assets/icon.png',
  './assets/chime.wav',
  './model/model.json',
  './model/classes.json',
  './model/group1-shard1of4.bin',
  './model/group1-shard2of4.bin',
  './model/group1-shard3of4.bin',
  './model/group1-shard4of4.bin'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching acoustic assets and neural weights...');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[Service Worker] Some assets could not be pre-cached immediately:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing deprecated cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Cache-first strategy for local assets and model shards
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cache external scripts like TensorFlow.js or Google fonts dynamically
        if (
          event.request.method === 'GET' &&
          (event.request.url.includes('cdn.jsdelivr.net') ||
            event.request.url.includes('fonts.googleapis.com') ||
            event.request.url.includes('fonts.gstatic.com'))
        ) {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }
        return networkResponse;
      });
    })
  );
});
