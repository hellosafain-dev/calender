import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.json({ status: 'healthy', database: 'Supabase (Postgres)', version: '2.0.0' });
}
