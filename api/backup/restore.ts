import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, generateId } from '../../lib/supabase.js';
import { requireAdmin } from '../../lib/vercel-auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = requireAdmin(req, res);
  if (!user) return;

  const { memories, reminders } = req.body;
  if (!Array.isArray(memories)) {
    return res.status(400).json({ error: 'Invalid backup format' });
  }

  let imported = 0;
  for (const m of memories) {
    if (!m.date || !m.title || !m.note || !m.flowerId) continue;
    const { error } = await supabase.from('memories').upsert({
      id: m.id || generateId('mem'),
      date: m.date, title: m.title, note: m.note,
      flower_id: m.flowerId, mood: m.mood || null,
      weather: m.weather || null, music: m.music || null,
      tags: m.tags || [], photos: m.photos || [],
      is_favorite: m.isFavorite || false,
      is_draft: m.isDraft || false,
      created_at: m.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    if (!error) imported++;
  }

  return res.json({ success: true, imported: { memories: imported } });
}
