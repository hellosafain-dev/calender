import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, dbToMemory, dbToReminder } from '../../lib/supabase.js';
import { requireAdmin } from '../../lib/vercel-auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = requireAdmin(req, res);
  if (!user) return;

  const [{ data: memories }, { data: reminders }, { data: settings }] = await Promise.all([
    supabase.from('memories').select('*').order('date', { ascending: true }),
    supabase.from('reminders').select('*').order('created_at', { ascending: true }),
    supabase.from('settings').select('key, value'),
  ]);

  const map: Record<string, string> = {};
  (settings || []).forEach((s: any) => { map[s.key] = s.value; });

  return res.json({
    version: '2.0',
    exportedAt: new Date().toISOString(),
    memories: (memories || []).map(dbToMemory),
    reminders: (reminders || []).map(dbToReminder),
    settings: { theme: map['theme'], title: map['title'] },
  });
}
