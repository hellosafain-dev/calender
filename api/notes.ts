import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, generateId } from '../lib/supabase.js';
import { requireAuth } from '../lib/vercel-auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = requireAuth(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('notes').select('*').order('updated_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'POST') {
    const { title, content, folder, isPinned } = req.body;
    const { data, error } = await supabase
      .from('notes')
      .insert({
        id: generateId('not'),
        title,
        content,
        folder: folder || 'Personal',
        is_pinned: !!isPinned
      })
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, note: data });
  }

  if (req.method === 'PUT') {
    const { id, title, content, folder, isPinned } = req.body;
    const { data, error } = await supabase
      .from('notes')
      .update({
        title,
        content,
        folder,
        is_pinned: isPinned,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, note: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
