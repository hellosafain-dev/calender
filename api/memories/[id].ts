import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, dbToMemory } from '../../lib/supabase.js';
import { requireAuth, requireAdmin } from '../../lib/vercel-auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query as { id: string };

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('memories').select('*').eq('id', id).single();
    if (error || !data) return res.status(404).json({ error: 'Memory not found' });
    return res.json(dbToMemory(data));
  }

  if (req.method === 'PUT') {
    const user = requireAdmin(req, res);
    if (!user) return;

    const { data: existing, error: fetchError } = await supabase.from('memories').select('*').eq('id', id).single();
    if (fetchError || !existing) return res.status(404).json({ error: 'Memory not found' });

    const { date, title, note, flowerId, mood, weather, music, tags, photos, isDraft, isFavorite } = req.body;
    const { data: updated, error } = await supabase
      .from('memories')
      .update({
        date: date ?? existing.date,
        title: title ?? existing.title,
        note: note ?? existing.note,
        flower_id: flowerId ?? existing.flower_id,
        mood: mood ?? existing.mood,
        weather: weather ?? existing.weather,
        music: music ?? existing.music,
        tags: tags ?? existing.tags,
        photos: photos ?? existing.photos,
        is_draft: isDraft !== undefined ? isDraft : existing.is_draft,
        is_favorite: isFavorite !== undefined ? isFavorite : existing.is_favorite,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, memory: dbToMemory(updated) });
  }

  if (req.method === 'DELETE') {
    const user = requireAdmin(req, res);
    if (!user) return;
    const { error } = await supabase.from('memories').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
