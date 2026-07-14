import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, dbToMemory } from '../../lib/supabase.js';
import { requireAuth, requireAdmin } from '../../lib/vercel-auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id, action } = req.query as { id: string; action?: string };

  // ─── Fetch Memory (GET) ────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('memories').select('*').eq('id', id).single();
    if (error || !data) return res.status(404).json({ error: 'Memory not found' });
    return res.json(dbToMemory(data));
  }

  // ─── Update Memory (PUT) ────────────────────────────────────────────────────
  if (req.method === 'PUT') {
    const user = requireAuth(req, res);
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

    // Auto theme update
    const activeFlowerId = flowerId ?? existing.flower_id;
    const isDraftState = isDraft !== undefined ? isDraft : existing.is_draft;
    const flowerToThemeMap: Record<string, string> = {
      rose: 'cherry',
      peony: 'light',
      tulip: 'spring',
      lavender: 'lavender',
      sunflower: 'autumn',
      cherry_blossom: 'cherry',
    };
    const targetTheme = flowerToThemeMap[activeFlowerId];
    if (targetTheme && !isDraftState) {
      await supabase.from('settings').upsert({ key: 'theme', value: targetTheme }, { onConflict: 'key' });
    }

    return res.json({ success: true, memory: dbToMemory(updated) });
  }

  // ─── Custom POST Actions (toggle-favorite & delete) ────────────────────────
  if (req.method === 'POST') {
    if (action === 'toggle-favorite') {
      const user = requireAuth(req, res);
      if (!user) return;

      const { data: existing, error: fetchError } = await supabase.from('memories').select('is_favorite').eq('id', id).single();
      if (fetchError || !existing) return res.status(404).json({ error: 'Memory not found' });

      const { data: updated, error } = await supabase
        .from('memories')
        .update({ is_favorite: !existing.is_favorite, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true, isFavorite: updated.is_favorite });
    }

    if (action === 'delete') {
      const user = requireAuth(req, res);
      if (!user) return;

      const { error } = await supabase.from('memories').delete().eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true });
    }
  }

  // ─── Standard Delete (DELETE) ──────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const user = requireAuth(req, res);
    if (!user) return;

    const { error } = await supabase.from('memories').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
