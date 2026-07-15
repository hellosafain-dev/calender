import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getVapidKeys } from '../../lib/vercel-push.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const { publicKey } = await getVapidKeys();
    res.json({ publicKey });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch public key' });
  }
}
