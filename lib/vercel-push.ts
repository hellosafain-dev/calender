import { supabase } from './supabase.js';
import webpush from 'web-push';
import { FLOWERS } from '../src/lib/themes.js';

// Setup VAPID details
const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (publicKey && privateKey) {
  webpush.setVapidDetails(
    'mailto:support@bloom-diary.dev',
    publicKey,
    privateKey
  );
}

export async function broadcastPushNotification(payload: { title: string; body: string; icon?: string; tag?: string; url?: string }) {
  if (!publicKey || !privateKey) {
    console.warn('VAPID keys not configured - skipping push notification');
    return;
  }

  try {
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (!subscriptions || subscriptions.length === 0) return;

    const payloadStr = JSON.stringify(payload);

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }, payloadStr);
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`Push subscription expired. Deleting endpoint: ${sub.endpoint}`);
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }
    }
  } catch (err) {
    console.error('Error broadcasting push notification:', err);
  }
}

export async function notifyFlowerUpdate(flowerId: string, title: string) {
  try {
    const flower = FLOWERS[flowerId];
    const flowerName = flower ? flower.name : 'a new flower';
    await broadcastPushNotification({
      title: 'New Flower Planted! 🌸',
      body: `"${title}" has been added as a ${flowerName} to the Sanctuary.`,
      tag: `flower-update-${Date.now()}`,
      url: '/'
    });
  } catch (err) {
    console.error('Error notifying flower update:', err);
  }
}
