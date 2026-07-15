import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, generateId } from '../lib/supabase.js';
import { requireAuth } from '../lib/vercel-auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = requireAuth(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const { date } = req.query;
    let query = supabase.from('planner_tasks').select('*');
    if (date) query = query.eq('date', date);
    
    const { data, error } = await query.order('order_index', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'POST') {
    const { title, period, orderIndex, date } = req.body;
    const { data, error } = await supabase
      .from('planner_tasks')
      .insert({
        id: generateId('pln'),
        title,
        period,
        order_index: orderIndex,
        is_completed: false,
        date
      })
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, task: data });
  }

  if (req.method === 'PUT') {
    const { id, title, period, orderIndex, isCompleted, date } = req.body;
    const { data, error } = await supabase
      .from('planner_tasks')
      .update({
        title,
        period,
        order_index: orderIndex,
        is_completed: isCompleted,
        date
      })
      .eq('id', id)
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, task: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    const { error } = await supabase.from('planner_tasks').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
