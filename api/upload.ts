import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase.js';
import { requireAdmin } from '../lib/vercel-auth.js';

// Disable default body parsing limits for large photo uploads (up to 15MB)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = requireAdmin(req, res);
  if (!user) return;

  const { file, name } = req.body;
  if (!file || typeof file !== 'string') {
    return res.status(400).json({ error: 'Invalid file payload: file field is required' });
  }

  try {
    // Parse the base64 URI data
    const matches = file.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 format' });
    }

    const contentType = matches[1];
    const base64Data = matches[2];
    const fileBuffer = Buffer.from(base64Data, 'base64');
    
    // Generate unique name matching original extension
    const originalExt = name ? name.split('.').pop() : 'png';
    const fileName = `${Date.now()}-${Math.floor(Math.random() * 1e9)}.${originalExt}`;

    // Upload to Supabase Storage Bucket 'photos'
    const { data, error } = await supabase.storage
      .from('photos')
      .upload(fileName, fileBuffer, {
        contentType,
        cacheControl: '31536000',
        upsert: false
      });

    if (error) {
      return res.status(500).json({ error: `Supabase Storage upload failed: ${error.message}` });
    }

    // Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName);

    res.json({ success: true, url: publicUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
