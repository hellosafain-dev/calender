import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase.js';
import { requireAdmin } from '../../lib/vercel-auth.js';
import bcrypt from 'bcryptjs';

const VALID_THEMES = [
  'light','dark','autumn','spring','lavender','cherry','forest','ocean','elegant_dark',
  'rapunzel','barbie','oswald','butterfly','sunshine','gilded_rose','midnight_forest','cosmic_stardust'
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { data } = await supabase.from('settings').select('key, value');
    const map: Record<string, string> = {};
    (data || []).forEach((r: any) => { map[r.key] = r.value; });
    return res.json({
      theme: map['theme'] || 'elegant_dark',
      title: map['title'] || 'Bloom Diary',
      autoCycle: map['autoCycle'] === 'true',
      hasAdminPassword: !!map['admin_password'],
      hasViewerPassword: !!map['viewer_password'],
      customGreeting: map['custom_greeting'] || '',
    });
  }

  if (req.method === 'POST') {
    const user = requireAdmin(req, res);
    if (!user) return;

    const { theme, title, passwordHash, viewerPasswordHash, autoCycle, customGreeting } = req.body;
    const updates: any[] = [];

    if (theme && VALID_THEMES.includes(theme)) updates.push({ key: 'theme', value: theme });
    if (title && typeof title === 'string') updates.push({ key: 'title', value: title.trim() });
    if (passwordHash) updates.push({ key: 'admin_password', value: bcrypt.hashSync(passwordHash, 10) });
    if (viewerPasswordHash) updates.push({ key: 'viewer_password', value: bcrypt.hashSync(viewerPasswordHash, 10) });
    if (autoCycle !== undefined) updates.push({ key: 'autoCycle', value: String(autoCycle) });
    if (customGreeting !== undefined) updates.push({ key: 'custom_greeting', value: String(customGreeting).trim() });

    for (const u of updates) {
      await supabase.from('settings').upsert(u, { onConflict: 'key' });
    }

    const { data } = await supabase.from('settings').select('key, value');
    const map: Record<string, string> = {};
    (data || []).forEach((r: any) => { map[r.key] = r.value; });
    return res.json({
      success: true,
      theme: map['theme'],
      title: map['title'],
      autoCycle: map['autoCycle'] === 'true',
      customGreeting: map['custom_greeting'] || '',
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
