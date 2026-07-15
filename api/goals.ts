import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, generateId } from '../lib/supabase.js';
import { requireAuth } from '../lib/vercel-auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = requireAuth(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('goals').select('*').order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'POST') {
    const { title, description, deadline, category } = req.body;
    const { data, error } = await supabase
      .from('goals')
      .insert({
        id: generateId('gol'),
        title,
        description,
        deadline,
        category,
        progress: 0,
        is_completed: false
      })
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, goal: data });
  }

  if (req.method === 'PUT') {
    const { id, title, description, deadline, category, progress, isCompleted } = req.body;
    const { data, error } = await supabase
      .from('goals')
      .update({
        title,
        description,
        deadline,
        category,
        progress,
        is_completed: isCompleted
      })
      .eq('id', id)
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, goal: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
