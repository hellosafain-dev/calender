// Service Worker Push Event Listener
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'Bloom Diary';
    const options = {
      body: data.body || 'A new update in your garden.',
      icon: data.icon || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'garden-update',
      // Aggressive alarm vibration pattern
      vibrate: [500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 450, 110, 200, 110, 170, 40, 500],
      requireInteraction: true, // Forces it to stay on screen until dismissed
      renotify: true, // Forces sound/vibration even if old notification is still there
      silent: false,
      actions: [
        { action: 'open', title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss' }
      ],
      data: {
        url: data.url || '/'
      }
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    console.error('Error handling push event:', err);
    // Fallback if data is not JSON
    event.waitUntil(
      self.registration.showNotification('Bloom Diary', {
        body: event.data.text()
      })
    );
  }
});

// Notification Click Event Listener (Open the app when clicked)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return; // Just close it, do not open the app
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window client is already open, focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
