import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, dbToReminder, generateId } from '../../lib/supabase.js';
import { requireAuth, requireAdmin } from '../../lib/vercel-auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('reminders').select('*').order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.json((data || []).map(dbToReminder));
  }

  if (req.method === 'POST') {
    const user = requireAdmin(req, res);
    if (!user) return;
    const { title, time, date, repeat, type } = req.body;
    if (!title || !time || !repeat || !type) {
      return res.status(400).json({ error: 'Missing required fields: title, time, repeat, type' });
    }
    const now = new Date().toISOString();
    const { data: created, error } = await supabase
      .from('reminders')
      .insert({ id: generateId('rem'), title, time, date: date || null, repeat, type, is_active: true, created_at: now })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, reminder: dbToReminder(created) });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
