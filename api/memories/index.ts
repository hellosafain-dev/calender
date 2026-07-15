import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, dbToMemory, generateId } from '../../lib/supabase.js';
import { requireAuth, requireAdmin } from '../../lib/vercel-auth.js';
import { notifyFlowerUpdate } from '../../lib/vercel-push.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(200, parseInt(req.query.limit as string) || 100);
    const offset = (page - 1) * limit;

    const { data, count, error } = await supabase
      .from('memories')
      .select('*', { count: 'exact' })
      .order('date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) return res.status(500).json({ error: error.message });

    return res.json({
      data: (data || []).map(dbToMemory),
      total: count || 0,
      page,
      pages: Math.ceil((count || 0) / limit),
    });
  }

  if (req.method === 'POST') {
    const user = requireAuth(req, res);
    if (!user) return;

    const { date, title, note, flowerId, mood, weather, music, tags, photos, isDraft } = req.body;
    if (!date || !title || !note || !flowerId) {
      return res.status(400).json({ error: 'Missing required fields: date, title, note, flowerId' });
    }

    // Check if non-draft exists for this date
    const { data: existing } = await supabase
      .from('memories')
      .select('*')
      .eq('date', date)
      .single();

    const flowerToThemeMap: Record<string, string> = {
      rose: 'cherry',
      peony: 'light',
      tulip: 'spring',
      lavender: 'lavender',
      sunflower: 'autumn',
      cherry_blossom: 'cherry',
    };
    const targetTheme = flowerToThemeMap[flowerId];

    if (existing && !isDraft) {
      const { data: updated, error } = await supabase
        .from('memories')
        .update({ title, note, flower_id: flowerId, mood, weather, music, tags: tags || [], photos: photos || existing.photos, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      if (targetTheme) {
        await supabase.from('settings').upsert({ key: 'theme', value: targetTheme }, { onConflict: 'key' });
      }

      await notifyFlowerUpdate(flowerId, title);

      return res.json({ success: true, memory: dbToMemory(updated), updated: true });
    }

    const now = new Date().toISOString();
    const { data: created, error } = await supabase
      .from('memories')
      .insert({
        id: generateId('mem'),
        date, title, note,
        flower_id: flowerId,
        mood: mood || null,
        weather: weather || null,
        music: music || null,
        tags: tags || [],
        photos: photos || [],
        is_favorite: false,
        is_draft: !!isDraft,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    if (targetTheme && !isDraft) {
      await supabase.from('settings').upsert({ key: 'theme', value: targetTheme }, { onConflict: 'key' });
    }

    if (!isDraft) {
      await notifyFlowerUpdate(flowerId, title);
    }

    return res.json({ success: true, memory: dbToMemory(created) });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
