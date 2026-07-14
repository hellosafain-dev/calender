import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, dbToMemory } from '../../../lib/supabase.js';
import { requireAuth } from '../../../lib/vercel-auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = requireAuth(req, res);
  if (!user) return;

  const { id } = req.query as { id: string };
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
