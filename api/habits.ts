import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, generateId } from '../lib/supabase.js';
import { requireAuth } from '../lib/vercel-auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = requireAuth(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('habits').select('*').order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'POST') {
    const { title, flowerId, frequency } = req.body;
    const { data, error } = await supabase
      .from('habits')
      .insert({
        id: generateId('hab'),
        title,
        flower_id: flowerId,
        frequency,
        completed_dates: [],
        streak: 0
      })
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, habit: data });
  }

  if (req.method === 'PUT') {
    const { id, title, flowerId, frequency, completedDates, streak } = req.body;
    const { data, error } = await supabase
      .from('habits')
      .update({
        title,
        flower_id: flowerId,
        frequency,
        completed_dates: completedDates,
        streak
      })
      .eq('id', id)
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, habit: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    const { error } = await supabase.from('habits').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
