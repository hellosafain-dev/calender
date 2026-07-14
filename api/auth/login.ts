import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'bloom-diary-dev-secret-change-in-production-32chars';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ success: false, error: 'Password is required' });
  }

  const { data: settings } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['admin_password', 'viewer_password']);

  const adminHash = settings?.find((s: any) => s.key === 'admin_password')?.value;
  const viewerHash = settings?.find((s: any) => s.key === 'viewer_password')?.value;

  if (adminHash && bcrypt.compareSync(password, adminHash)) {
    const token = jwt.sign({ role: 'admin', username: 'Administrator' }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({ success: true, role: 'admin', username: 'Administrator', token });
  }

  if (viewerHash && bcrypt.compareSync(password, viewerHash)) {
    const token = jwt.sign({ role: 'viewer', username: 'Viewer' }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({ success: true, role: 'viewer', username: 'Viewer', token });
  }

  return res.status(401).json({ success: false, error: 'Incorrect password' });
}
