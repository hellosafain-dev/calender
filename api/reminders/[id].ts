import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, dbToReminder } from '../../lib/supabase.js';
import { requireAdmin } from '../../lib/vercel-auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query as { id: string };

  if (req.method === 'PUT') {
    const user = requireAdmin(req, res);
    if (!user) return;

    const { data: existing } = await supabase.from('reminders').select('*').eq('id', id).single();
    if (!existing) return res.status(404).json({ error: 'Reminder not found' });

    const { title, time, date, repeat, type, isActive } = req.body;
    const { data: updated, error } = await supabase
      .from('reminders')
      .update({
        title: title ?? existing.title,
        time: time ?? existing.time,
        date: date ?? existing.date,
        repeat: repeat ?? existing.repeat,
        type: type ?? existing.type,
        is_active: isActive !== undefined ? isActive : existing.is_active,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, reminder: dbToReminder(updated) });
  }

  if (req.method === 'DELETE') {
    const user = requireAdmin(req, res);
    if (!user) return;
    const { error } = await supabase.from('reminders').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
