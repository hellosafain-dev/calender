import { API } from "./api.js";

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestAndInitPushNotifications(): Promise<{ success: boolean; error?: string }> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported on this browser/device.');
    return { success: false, error: 'Push notifications are not supported on your browser or device.' };
  }

  try {
    let permission = Notification.permission;
    if (permission === 'default') {
      // Prompt user explicitly
      permission = await Notification.requestPermission();
    }
    
    if (permission !== 'granted') {
      console.log('Notification permission not granted.');
      return { success: false, error: 'You must grant notification permissions in your browser settings.' };
    }

    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      console.log('No service worker registered. Registering /sw.js...');
      registration = await navigator.serviceWorker.register('/sw.js');
    }
    
    // Ensure it's ready
    registration = await navigator.serviceWorker.ready;
    
    // Get public VAPID key from backend
    const vapidRes = await API.getVapidPublicKey().catch(e => { throw new Error(`VAPID Key Error: ${e.message}`); });
    const convertedVapidKey = urlBase64ToUint8Array(vapidRes.publicKey);

    // Subscribe browser to Web Push
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      }).catch(e => { throw new Error(`Push Subscribe Error: ${e.message}`); });
    }

    // Send subscription info to backend to register device
    const subJSON = subscription.toJSON();
    if (subJSON.endpoint && subJSON.keys) {
      await API.subscribePush({
        endpoint: subJSON.endpoint,
        keys: {
          p256dh: subJSON.keys.p256dh,
          auth: subJSON.keys.auth
        }
      }).catch(e => { throw new Error(`Backend Sync Error: ${e.message}`); });
      console.log('Successfully registered device for background push notifications!');
      return { success: true };
    }
    return { success: false, error: 'Failed to generate a valid push subscription payload.' };
  } catch (err: any) {
    console.error('Failed to initialize push notifications:', err);
    return { success: false, error: err.message || 'An unknown error occurred during subscription.' };
  }
}
