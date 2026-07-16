import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, dbToMemory, dbToReminder, generateId } from '../lib/supabase.js';
import { requireAuth, requireAdmin } from '../lib/vercel-auth.js';
import { getVapidKeys, notifyFlowerUpdate } from '../lib/vercel-push.js';
import { GoogleGenAI, Type } from '@google/genai';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import webpush from 'web-push';
import sharp from 'sharp';

// Helper to convert base64 photos to cloud urls
async function processAndUploadPhotos(photos: string[]): Promise<string[]> {
  if (!photos || !Array.isArray(photos)) return [];
  const processedUrls: string[] = [];
  
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    if (typeof photo !== 'string') continue;
    
    // If it's already a URL, keep it
    if (photo.startsWith('http://') || photo.startsWith('https://')) {
      processedUrls.push(photo);
      continue;
    }
    
    // If it's a base64 string, process and upload it
    if (photo.startsWith('data:image/')) {
      try {
        const matches = photo.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          processedUrls.push(photo);
          continue;
        }
        const buffer = Buffer.from(matches[2], 'base64');
        
        // Compress and resize
        const optimizedBuffer = await sharp(buffer)
          .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
          
        const fileName = `mem_${Date.now()}_${i}_${Math.floor(Math.random()*1000)}.webp`;
        
        const { error } = await supabase.storage
          .from('memories')
          .upload(fileName, optimizedBuffer, {
            contentType: 'image/webp',
            upsert: false
          });
          
        if (error) {
          console.error("Storage upload error:", error);
          processedUrls.push(photo); // fallback to raw base64
          continue;
        }
        
        const { data: publicUrlData } = supabase.storage
          .from('memories')
          .getPublicUrl(fileName);
          
        processedUrls.push(publicUrlData.publicUrl);
      } catch (err) {
        console.error("Sharp/Upload error:", err);
        processedUrls.push(photo); // fallback to raw base64
      }
    } else {
      processedUrls.push(photo);
    }
  }
  
  return processedUrls;
}

const JWT_SECRET = process.env.JWT_SECRET || 'bloom-diary-dev-secret-change-in-production-32chars';

// Disable default body parsing limits for large photo uploads (up to 15MB)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

const VALID_THEMES = [
  'light','dark','autumn','spring','lavender','cherry','forest','ocean','elegant_dark',
  'rapunzel','barbie','oswald','butterfly','sunshine','gilded_rose','midnight_forest','cosmic_stardust'
];

const POETIC_FALLBACKS = [
  { quote: 'Love is a garden where sweet memories quietly bloom day by day.', sentiment: 'The rose tells a story of endless devotion.' },
  { quote: 'Every shared laugh becomes a flower that never fades.', sentiment: 'Sunflowers follow your golden smile.' },
  { quote: 'In the quiet corners of my heart, you blossom eternally.', sentiment: 'Cherry blossoms carry our gentle promises.' },
  { quote: 'Peace is holding your hand under the autumn stars.', sentiment: 'Lavender whispers sweet, calming melodies.' },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Extract and normalize the requested path
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  let pathname = url.pathname;
  pathname = pathname.replace(/\/+$/, ''); // Remove trailing slashes

  // Standard OPTIONS check for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ROUTING & PATH MATCHING
  // ───────────────────────────────────────────────────────────────────────────

  // 1. Health check
  if (pathname === '/api/health') {
    return res.json({ status: 'healthy', database: 'Supabase (Postgres)', version: '2.0.0' });
  }

  // 2. Auth: Login
  if (pathname === '/api/auth/login') {
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

  // 3. Settings (GET / POST)
  if (pathname === '/api/settings') {
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

  // 4. Backup (GET / POST)
  if (pathname === '/api/backup' || pathname === '/api/backup/export' || pathname === '/api/backup/restore') {
    const user = requireAdmin(req, res);
    if (!user) return;

    // Export Backup (GET)
    if (req.method === 'GET' || pathname === '/api/backup/export') {
      const [{ data: memories }, { data: reminders }, { data: settings }] = await Promise.all([
        supabase.from('memories').select('*').order('date', { ascending: true }),
        supabase.from('reminders').select('*').order('created_at', { ascending: true }),
        supabase.from('settings').select('key, value'),
      ]);

      const map: Record<string, string> = {};
      (settings || []).forEach((s: any) => { map[s.key] = s.value; });

      return res.json({
        version: '2.0',
        exportedAt: new Date().toISOString(),
        memories: (memories || []).map(dbToMemory),
        reminders: (reminders || []).map(dbToReminder),
        settings: { theme: map['theme'], title: map['title'] },
      });
    }

    // Restore Backup (POST)
    if (req.method === 'POST' || pathname === '/api/backup/restore') {
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

    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 5. Gemini: Quote (POST)
  if (pathname === '/api/gemini/quote') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const user = requireAuth(req, res);
    if (!user) return;

    const { mood, flowerName } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.json(POETIC_FALLBACKS[Math.floor(Math.random() * POETIC_FALLBACKS.length)]);
    }

    try {
      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'bloom-diary' } } });
      const prompt = `Write an extremely romantic, heartwarming, poetic quote about love, memories, and flowers.
${mood ? `The current mood is: '${mood}'.` : ''}
${flowerName ? `The selected flower is: '${flowerName}'.` : ''}
Provide an ultra-short poetic quote (max 15 words) and a matching romantic sentiment (max 20 words).`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              quote: { type: Type.STRING },
              sentiment: { type: Type.STRING },
            },
            required: ['quote', 'sentiment'],
          },
        },
      });

      const raw = (response.text || '').trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
      return res.json(JSON.parse(raw));
    } catch (err) {
      console.error('Gemini error:', err);
      return res.json(POETIC_FALLBACKS[Math.floor(Math.random() * POETIC_FALLBACKS.length)]);
    }
  }

  // 6. Upload Photo (POST)
  if (pathname === '/api/upload') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const user = requireAuth(req, res);
    if (!user) return;

    const { file, name } = req.body;
    if (!file || typeof file !== 'string') {
      return res.status(400).json({ error: 'Invalid file payload: file field is required' });
    }

    try {
      const matches = file.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: 'Invalid base64 format' });
      }

      const contentType = matches[1];
      const base64Data = matches[2];
      const fileBuffer = Buffer.from(base64Data, 'base64');

      const originalExt = name ? name.split('.').pop() : 'png';
      const fileName = `${Date.now()}-${Math.floor(Math.random() * 1e9)}.${originalExt}`;

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

      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);

      return res.json({ success: true, url: publicUrl });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 7. Push Notifications Subsystem
  if (pathname.startsWith('/api/push')) {
    // A. VAPID public key
    if (pathname === '/api/push/vapid-public-key') {
      try {
        const { publicKey } = await getVapidKeys();
        return res.json({ publicKey });
      } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Failed to fetch public key' });
      }
    }

    // B. Subscribe Push Subscription
    if (pathname === '/api/push/subscribe') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: 'Endpoint and keys (p256dh, auth) are required' });
      }

      const id = generateId('sub');
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          created_at: new Date().toISOString()
        }, { onConflict: 'endpoint' });

      if (error) {
        console.error('Supabase subscription error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.json({ success: true });
    }

    // C. Unsubscribe Push Subscription
    if (pathname === '/api/push/unsubscribe') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

      const { endpoint } = req.body;
      if (!endpoint) {
        return res.status(400).json({ error: 'Endpoint is required' });
      }

      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', endpoint);

      if (error) {
        console.error('Supabase unsubscribe error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.json({ success: true });
    }

    // D. Cron Alarm Background Worker (Secured!)
    if (pathname === '/api/push/cron-alarm') {
      // 🔒 Security check
      const cronSecret = process.env.CRON_SECRET;
      if (cronSecret) {
        const headerSecret = req.headers['x-cron-secret'] || req.headers['authorization'] || req.headers['x-api-key'];
        const querySecret = req.query.secret;
        if (headerSecret !== cronSecret && querySecret !== cronSecret) {
          return res.status(401).json({ error: 'Unauthorized: Invalid cron secret key provided' });
        }
      }

      const { publicKey, privateKey } = await getVapidKeys();

      webpush.setVapidDetails(
        'mailto:support@bloom-diary.dev',
        publicKey,
        privateKey
      );

      const { data: tzSetting } = await supabase.from('settings').select('value').eq('key', 'timezone').single();
      const timeZone = tzSetting?.value || 'Asia/Kolkata';

      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });
      const parts = formatter.formatToParts(now);
      const p: Record<string, string> = {};
      parts.forEach(part => { p[part.type] = part.value; });
      
      const currentHHMM = `${p.hour}:${p.minute}`;
      const currentYYYYMMDD = `${p.year}-${p.month}-${p.day}`;

      try {
        const { data: reminders, error: fetchError } = await supabase
          .from('reminders')
          .select('*')
          .eq('is_active', true)
          .eq('time', currentHHMM);

        if (fetchError) {
          console.error('Fetch reminders error:', fetchError);
          return res.status(500).json({ error: fetchError.message });
        }

        if (!reminders || reminders.length === 0) {
          return res.json({ success: true, message: 'No reminders due at this minute: ' + currentHHMM });
        }

        const { data: subscriptions, error: subError } = await supabase
          .from('push_subscriptions')
          .select('*');

        if (subError) {
          console.error('Fetch subscriptions error:', subError);
          return res.status(500).json({ error: subError.message });
        }

        if (!subscriptions || subscriptions.length === 0) {
          return res.json({ success: true, message: 'No push subscriptions registered' });
        }

        let triggeredCount = 0;

        for (const r of reminders) {
          let isMatched = false;
          const baseDate = new Date(r.date || r.created_at);

          if (r.repeat === 'none') {
            if (r.date) {
              isMatched = r.date === currentYYYYMMDD;
            } else {
              isMatched = true;
            }
          } else if (r.repeat === 'daily') {
            isMatched = true;
          } else if (r.repeat === 'weekly') {
            isMatched = now.getDay() === baseDate.getDay();
          } else if (r.repeat === 'monthly') {
            isMatched = now.getDate() === baseDate.getDate();
          } else if (r.repeat === 'yearly') {
            isMatched = now.getMonth() === baseDate.getMonth() && now.getDate() === baseDate.getDate();
          }

          if (isMatched) {
            triggeredCount++;
            const cleanTitle = r.title.split('|')[0].trim();
            const typeLabel = r.type.charAt(0).toUpperCase() + r.type.slice(1);

            const payload = JSON.stringify({
              title: cleanTitle,
              body: `Time for your ${typeLabel} reminder!`,
              tag: `reminder-${r.id}`,
              url: '/?tab=2'
            });

            for (const sub of subscriptions) {
              try {
                await webpush.sendNotification({
                  endpoint: sub.endpoint,
                  keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                  }
                }, payload);
              } catch (err: any) {
                if (err.statusCode === 410 || err.statusCode === 404) {
                  console.log(`Push subscription expired. Deleting endpoint: ${sub.endpoint}`);
                  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
                }
              }
            }
          }
        }

        return res.json({ success: true, triggeredRemindersCount: triggeredCount });
      } catch (err: any) {
        console.error('Cron alarm error:', err);
        return res.status(500).json({ error: err.message || 'Cron error' });
      }
    }
  }

  // 8. Memories Subsystem (Index & Details/Actions)
  if (pathname.startsWith('/api/memories')) {
    // Check if it is the collection endpoint /api/memories
    if (pathname === '/api/memories') {
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
          const finalPhotos = photos ? await processAndUploadPhotos(photos) : existing.photos;
          const { data: updated, error } = await supabase
            .from('memories')
            .update({ title, note, flower_id: flowerId, mood, weather, music, tags: tags || [], photos: finalPhotos, updated_at: new Date().toISOString() })
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
            photos: photos ? await processAndUploadPhotos(photos) : [],
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
    }

    // Otherwise it is memory details /api/memories/:id or /api/memories/:id/toggle-favorite or /api/memories/:id/delete
    const memoriesIdMatch = pathname.match(/^\/api\/memories\/([^\/]+)(?:\/(delete|toggle-favorite))?$/);
    if (memoriesIdMatch) {
      const id = memoriesIdMatch[1];
      const subAction = memoriesIdMatch[2];
      const action = subAction || (req.query.action as string);

      // A. Fetch Memory (GET)
      if (req.method === 'GET') {
        const { data, error } = await supabase.from('memories').select('*').eq('id', id).single();
        if (error || !data) return res.status(404).json({ error: 'Memory not found' });
        return res.json(dbToMemory(data));
      }

      // B. Update Memory (PUT)
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
            photos: photos ? await processAndUploadPhotos(photos) : existing.photos,
            is_draft: isDraft !== undefined ? isDraft : existing.is_draft,
            is_favorite: isFavorite !== undefined ? isFavorite : existing.is_favorite,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (error) return res.status(500).json({ error: error.message });

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

        if (!isDraftState) {
          await notifyFlowerUpdate(activeFlowerId, title ?? existing.title);
        }

        return res.json({ success: true, memory: dbToMemory(updated) });
      }

      // C. Delete & Toggle actions (POST)
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

      // D. Standard Delete (DELETE)
      if (req.method === 'DELETE') {
        const user = requireAuth(req, res);
        if (!user) return;

        const { error } = await supabase.from('memories').delete().eq('id', id);
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ success: true });
      }
    }
  }

  // 9. Reminders Subsystem
  if (pathname.startsWith('/api/reminders')) {
    // Collection /api/reminders
    if (pathname === '/api/reminders') {
      if (req.method === 'GET') {
        const { data, error } = await supabase.from('reminders').select('*').order('created_at', { ascending: true });
        if (error) return res.status(500).json({ error: error.message });
        return res.json((data || []).map(dbToReminder));
      }

      if (req.method === 'POST') {
        const user = requireAuth(req, res);
        if (!user) return;
        const { title, time, date, repeat, type } = req.body;
        if (!title || !time || !repeat || !type) {
          return res.status(400).json({ error: 'Missing required fields: title, time, repeat, type' });
        }
        const now = new Date().toISOString();
        const { data: created, error } = await supabase
          .from('reminders')
          .insert({ id: generateId('rem'), title, time, date: date || null, repeat, type, is_active: true, created_at: now })
          .select()
          .single();
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ success: true, reminder: dbToReminder(created) });
      }
    }

    // Reminders ID /api/reminders/:id
    const remindersIdMatch = pathname.match(/^\/api\/reminders\/([^\/]+)$/);
    if (remindersIdMatch) {
      const id = remindersIdMatch[1];

      if (req.method === 'PUT') {
        const user = requireAuth(req, res);
        if (!user) return;

        const { data: existing } = await supabase.from('reminders').select('*').eq('id', id).single();
        if (!existing) return res.status(404).json({ error: 'Reminder not found' });

        const { title, time, date, repeat, type, isActive } = req.body;
        const { data: updated, error } = await supabase
          .from('reminders')
          .update({
            title: title ?? existing.title,
            time: time ?? existing.time,
            date: date ?? existing.date,
            repeat: repeat ?? existing.repeat,
            type: type ?? existing.type,
            is_active: isActive !== undefined ? isActive : existing.is_active,
          })
          .eq('id', id)
          .select()
          .single();

        if (error) return res.status(500).json({ error: error.message });
        return res.json({ success: true, reminder: dbToReminder(updated) });
      }

      if (req.method === 'DELETE') {
        const user = requireAuth(req, res);
        if (!user) return;
        const { error } = await supabase.from('reminders').delete().eq('id', id);
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ success: true });
      }
    }
  }

  // 10. Catch-All Method Not Allowed / Not Found
  return res.status(404).json({ error: `Not Found: ${pathname}` });
}
