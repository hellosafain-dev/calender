import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase.js';
import webpush from 'web-push';
import { getVapidKeys } from '../../lib/vercel-push.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { publicKey, privateKey } = await getVapidKeys();

  webpush.setVapidDetails(
    'mailto:support@bloom-diary.dev',
    publicKey,
    privateKey
  );

  const now = new Date();
  const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const localYear = now.getFullYear();
  const localMonth = String(now.getMonth() + 1).padStart(2, '0');
  const localDay = String(now.getDate()).padStart(2, '0');
  const currentYYYYMMDD = `${localYear}-${localMonth}-${localDay}`;

  try {
    // Get active reminders from Supabase matching the current time
    const { data: reminders, error: fetchError } = await supabase
      .from('reminders')
      .select('*')
      .eq('is_active', true)
      .eq('time', currentHHMM);

    if (fetchError) {
      console.error('Fetch reminders error:', fetchError);
      return res.status(500).json({ error: fetchError.message });
    }

    if (!reminders || reminders.length === 0) {
      return res.json({ success: true, message: 'No reminders due at this minute: ' + currentHHMM });
    }

    // Get all subscriptions from Supabase
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (subError) {
      console.error('Fetch subscriptions error:', subError);
      return res.status(500).json({ error: subError.message });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.json({ success: true, message: 'No push subscriptions registered' });
    }

    let triggeredCount = 0;

    for (const r of reminders) {
      let isMatched = false;
      const baseDate = new Date(r.date || r.created_at);

      if (r.repeat === 'none') {
        if (r.date) {
          isMatched = r.date === currentYYYYMMDD;
        } else {
          isMatched = true;
        }
      } else if (r.repeat === 'daily') {
        isMatched = true;
      } else if (r.repeat === 'weekly') {
        isMatched = now.getDay() === baseDate.getDay();
      } else if (r.repeat === 'monthly') {
        isMatched = now.getDate() === baseDate.getDate();
      } else if (r.repeat === 'yearly') {
        isMatched = now.getMonth() === baseDate.getMonth() && now.getDate() === baseDate.getDate();
      }

      if (isMatched) {
        triggeredCount++;
        const cleanTitle = r.title.split('|')[0].trim();
        const typeLabel = r.type.charAt(0).toUpperCase() + r.type.slice(1);

        const payload = JSON.stringify({
          title: cleanTitle,
          body: `Time for your ${typeLabel} reminder!`,
          tag: `reminder-${r.id}`,
          url: '/?tab=2'
        });

        for (const sub of subscriptions) {
          try {
            await webpush.sendNotification({
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
              }
            }, payload);
          } catch (err: any) {
            if (err.statusCode === 410 || err.statusCode === 404) {
              console.log(`Push subscription expired. Deleting endpoint: ${sub.endpoint}`);
              await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
            }
          }
        }
      }
    }

    res.json({ success: true, triggeredRemindersCount: triggeredCount });
  } catch (err: any) {
    console.error('Cron alarm error:', err);
    res.status(500).json({ error: err.message || 'Cron error' });
  }
}
