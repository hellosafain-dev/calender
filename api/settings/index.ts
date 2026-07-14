import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase.js';
import { requireAdmin } from '../../lib/vercel-auth.js';
import bcrypt from 'bcryptjs';

const VALID_THEMES = ['light','dark','autumn','spring','lavender','cherry','forest','ocean','elegant_dark'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { data } = await supabase.from('settings').select('key, value');
    const map: Record<string, string> = {};
    (data || []).forEach((r: any) => { map[r.key] = r.value; });
    return res.json({
      theme: map['theme'] || 'elegant_dark',
      title: map['title'] || 'Bloom Diary',
      hasAdminPassword: !!map['admin_password'],
      hasViewerPassword: !!map['viewer_password'],
    });
  }

  if (req.method === 'POST') {
    const user = requireAdmin(req, res);
    if (!user) return;

    const { theme, title, passwordHash, viewerPasswordHash } = req.body;
    const updates: any[] = [];

    if (theme && VALID_THEMES.includes(theme)) updates.push({ key: 'theme', value: theme });
    if (title && typeof title === 'string') updates.push({ key: 'title', value: title.trim() });
    if (passwordHash) updates.push({ key: 'admin_password', value: bcrypt.hashSync(passwordHash, 10) });
    if (viewerPasswordHash) updates.push({ key: 'viewer_password', value: bcrypt.hashSync(viewerPasswordHash, 10) });

    for (const u of updates) {
      await supabase.from('settings').upsert(u, { onConflict: 'key' });
    }

    const { data } = await supabase.from('settings').select('key, value');
    const map: Record<string, string> = {};
    (data || []).forEach((r: any) => { map[r.key] = r.value; });
    return res.json({ success: true, theme: map['theme'], title: map['title'] });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
