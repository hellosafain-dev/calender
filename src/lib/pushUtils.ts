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

export async function requestAndInitPushNotifications(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported on this browser/device.');
    return false;
  }

  try {
    let permission = Notification.permission;
    if (permission === 'default') {
      // Prompt user explicitly
      permission = await Notification.requestPermission();
    }
    
    if (permission !== 'granted') {
      console.log('Notification permission not granted.');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    
    // Get public VAPID key from backend
    const { publicKey } = await API.getVapidPublicKey();
    const convertedVapidKey = urlBase64ToUint8Array(publicKey);

    // Subscribe browser to Web Push
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
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
      });
      console.log('Successfully registered device for background push notifications!');
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to initialize push notifications:', err);
    return false;
  }
}
