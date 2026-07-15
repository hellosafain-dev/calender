import { supabase } from './supabase.js';
import webpush from 'web-push';
import { FLOWERS } from '../src/lib/themes.js';

export async function getVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  try {
    const { data: dbKeys } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['vapid_public_key', 'vapid_private_key']);

    const map: Record<string, string> = {};
    (dbKeys || []).forEach((r: any) => { map[r.key] = r.value; });

    let publicKey = map['vapid_public_key'];
    let privateKey = map['vapid_private_key'];

    if (!publicKey || !privateKey) {
      console.log('Generating VAPID keys dynamically in Supabase...');
      const generated = webpush.generateVAPIDKeys();
      
      await supabase.from('settings').upsert({ key: 'vapid_public_key', value: generated.publicKey }, { onConflict: 'key' });
      await supabase.from('settings').upsert({ key: 'vapid_private_key', value: generated.privateKey }, { onConflict: 'key' });
      
      publicKey = generated.publicKey;
      privateKey = generated.privateKey;
    }

    return { publicKey, privateKey };
  } catch (err) {
    console.error('Error fetching/generating VAPID keys:', err);
    // Fallback if DB fails
    const generated = webpush.generateVAPIDKeys();
    return { publicKey: generated.publicKey, privateKey: generated.privateKey };
  }
}

export async function broadcastPushNotification(payload: { title: string; body: string; icon?: string; tag?: string; url?: string }) {
  try {
    const { publicKey, privateKey } = await getVapidKeys();

    webpush.setVapidDetails(
      'mailto:support@bloom-diary.dev',
      publicKey,
      privateKey
    );

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
