import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, generateId } from '../../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Endpoint and keys (p256dh, auth) are required' });
  }

  const id = generateId('sub');
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      created_at: new Date().toISOString()
    }, { onConflict: 'endpoint' });

  if (error) {
    console.error('Supabase subscription error:', error);
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true });
}
