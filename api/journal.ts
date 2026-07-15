import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, generateId } from '../lib/supabase.js';
import { requireAuth } from '../lib/vercel-auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = requireAuth(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('journal_entries').select('*').order('date', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'POST') {
    const { date, prompt, content } = req.body;
    const { data, error } = await supabase
      .from('journal_entries')
      .insert({
        id: generateId('jrn'),
        date,
        prompt,
        content
      })
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, entry: data });
  }

  if (req.method === 'PUT') {
    const { id, date, prompt, content } = req.body;
    const { data, error } = await supabase
      .from('journal_entries')
      .update({
        date,
        prompt,
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, entry: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    const { error } = await supabase.from('journal_entries').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
