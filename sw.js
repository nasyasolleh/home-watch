// Service Worker for HomeWatch PWA
const CACHE_NAME = 'homewatch-v1.0.2'; // Updated version to clear cache
const urlsToCache = [
  '/',
  '/index.html',
  // '/dashboard.html',
  '/community.html',
  // '/survey.html', // Removed from cache to prevent script loading issues
  '/resources.html',
  '/profile.html',
  '/css/style.css',
  '/css/dashboard.css',
  '/css/community.css',
  '/css/survey.css',
  '/css/resources.css',
  '/css/profile.css',
  '/js/main.js',
  '/js/auth.js',
  '/js/firebase-config.js',
  '/js/dashboard.js',
  '/js/community.js',
  '/js/survey.js',
  '/js/resources.js',
  '/js/profile.js',
  // Exclude survey-global.js from caching
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js'
];

// Install event - Cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - Smart caching strategy
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Network-first strategy for survey.html and JavaScript files to prevent caching issues
  if (url.pathname.includes('/survey.html') || 
      url.pathname.includes('/js/survey-global.js') ||
      url.pathname.includes('/js/config.js') ||
      url.pathname.includes('/js/utils.js') ||
      url.pathname.includes('/js/survey.js')) {
    
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Network request succeeded, return fresh content
          return response;
        })
        .catch(() => {
          // Network failed, try cache as fallback
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Cache-first strategy for other resources
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Background sync for offline data
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Sync offline data when connection is restored
  console.log('Background sync triggered');
  // Implementation for syncing offline survey responses, votes, etc.
}

// Push notifications
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: 'images/icon-192.svg',
      badge: 'images/badge-72.svg',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      actions: [
        {
          action: 'explore',
          title: 'View Details',
          icon: 'images/action-icon.svg'
        },
        {
          action: 'close',
          title: 'Close',
          icon: 'images/close-icon.svg'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/dashboard.html')
    );
  }
});
