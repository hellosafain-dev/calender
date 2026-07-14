/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bloom Diary — Production-grade Express Server
 * Security: Helmet + JWT auth + bcrypt + Zod validation + rate limiting
 * Database: SQLite via better-sqlite3 (WAL mode, typed queries)
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

dotenv.config({ path: '.env.local' });
dotenv.config();

// Import SQLite database layer
import {
  memoryQueries,
  reminderQueries,
  rowToMemory,
  rowToReminder,
  getSetting,
  setSetting,
} from './src/server/database.js';

import { ThemeType } from './src/types.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000');
const JWT_SECRET = process.env.JWT_SECRET || 'bloom-diary-dev-secret-change-in-production-32chars';
const IS_PROD = process.env.NODE_ENV === 'production';

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: IS_PROD
      ? undefined
      : false, // Disable CSP in dev for Vite HMR compatibility
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts. Please try again in 15 minutes.' },
});

// ─── JWT Auth Middleware ──────────────────────────────────────────────────────
interface JwtPayload {
  role: 'admin' | 'viewer';
  username: string;
  iat?: number;
  exp?: number;
}

function protect(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'] as string | undefined;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET) as JwtPayload;
    next();
  } catch {
    return res.status(403).json({ error: 'Forbidden: Token invalid or expired' });
  }
}

function requireAdmin(req: any, res: any, next: any) {
  if ((req.user as JwtPayload)?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ─── Zod Validation Schemas ───────────────────────────────────────────────────
const VALID_FLOWERS = ['rose', 'tulip', 'lavender', 'sunflower', 'cherry_blossom', 'jasmine', 'hydrangea', 'peony'] as const;
const VALID_MOODS = ['peaceful', 'joyful', 'nostalgic', 'romantic', 'grateful', 'calm'] as const;
const VALID_WEATHER = ['sunny', 'rainy', 'cloudy', 'snowy', 'windy'] as const;
const VALID_THEMES: ThemeType[] = [
  'light', 'dark', 'autumn', 'spring', 'lavender', 'cherry', 'forest', 'ocean', 'elegant_dark',
  'rapunzel', 'barbie', 'oswald', 'butterfly', 'sunshine', 'gilded_rose', 'midnight_forest', 'cosmic_stardust'
];

const MemoryCreateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  title: z.string().min(1).max(300),
  note: z.string().min(1).max(50000),
  flowerId: z.enum(VALID_FLOWERS),
  mood: z.enum(VALID_MOODS).optional(),
  weather: z.enum(VALID_WEATHER).optional(),
  music: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  photos: z.array(z.string().max(2000000)).max(10).optional(), // 2MB per base64 or URL
  isDraft: z.boolean().optional(),
});

const MemoryUpdateSchema = MemoryCreateSchema.partial().extend({
  isFavorite: z.boolean().optional(),
});

const ReminderSchema = z.object({
  title: z.string().min(1).max(200),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  repeat: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']),
  type: z.enum(['anniversary', 'birthday', 'prayer', 'medicine', 'custom']),
  isActive: z.boolean().optional(),
});

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check (public)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy', database: 'SQLite (WAL)', version: '2.0.0' });
});

// ── Auth ──────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', authLimiter, (req, res) => {
  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ success: false, error: 'Password is required' });
  }

  const adminHash = getSetting('admin_password');
  const viewerHash = getSetting('viewer_password');

  if (adminHash && bcrypt.compareSync(password, adminHash)) {
    const token = jwt.sign({ role: 'admin', username: 'Administrator' }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({ success: true, role: 'admin', username: 'Administrator', token });
  }

  if (viewerHash && bcrypt.compareSync(password, viewerHash)) {
    const token = jwt.sign({ role: 'viewer', username: 'Viewer' }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({ success: true, role: 'viewer', username: 'Viewer', token });
  }

  return res.status(401).json({ success: false, error: 'Incorrect password' });
});

// ── Settings ──────────────────────────────────────────────────────────────────
app.get('/api/settings', (req, res) => {
  // Public read for theme (needed before login)
  res.json({
    theme: getSetting('theme') || 'elegant_dark',
    title: getSetting('title') || 'Bloom Diary',
    autoCycle: getSetting('autoCycle') === 'true',
    hasAdminPassword: !!getSetting('admin_password'),
    hasViewerPassword: !!getSetting('viewer_password'),
  });
});

app.post('/api/settings', protect, requireAdmin, (req, res) => {
  const { theme, title, passwordHash, viewerPasswordHash, autoCycle } = req.body;

  if (theme && VALID_THEMES.includes(theme)) setSetting('theme', theme);
  if (title && typeof title === 'string' && title.length <= 100) setSetting('title', title.trim());
  if (passwordHash && typeof passwordHash === 'string' && passwordHash.length > 0) {
    setSetting('admin_password', bcrypt.hashSync(passwordHash, 10));
  }
  if (viewerPasswordHash && typeof viewerPasswordHash === 'string' && viewerPasswordHash.length > 0) {
    setSetting('viewer_password', bcrypt.hashSync(viewerPasswordHash, 10));
  }
  if (autoCycle !== undefined) {
    setSetting('autoCycle', String(autoCycle));
  }

  res.json({ 
    success: true, 
    theme: getSetting('theme'), 
    title: getSetting('title'),
    autoCycle: getSetting('autoCycle') === 'true'
  });
});

// ── Memories ──────────────────────────────────────────────────────────────────
app.get('/api/memories', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 100));
  const offset = (page - 1) * limit;

  const rows = memoryQueries.getPaginated.all(limit, offset) as any[];
  const total = (memoryQueries.count.get() as any).total;

  res.json({
    data: rows.map(rowToMemory),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});

app.post('/api/memories', protect, (req, res) => {
  const parse = MemoryCreateSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Validation failed', details: parse.error.flatten() });
  }

  const { date, title, note, flowerId, mood, weather, music, tags, photos, isDraft } = parse.data;
  const now = new Date().toISOString();

  const flowerToThemeMap: Record<string, string> = {
    rose: 'cherry',
    peony: 'light',
    tulip: 'spring',
    lavender: 'lavender',
    sunflower: 'autumn',
    cherry_blossom: 'cherry',
  };
  const targetTheme = flowerToThemeMap[flowerId];

  // Check if non-draft memory for this date already exists — merge/update
  const existing = memoryQueries.getByDate.get(date) as any;
  if (existing && !isDraft) {
    memoryQueries.update.run(
      date, title, note, flowerId,
      mood || null, weather || null, music || null,
      JSON.stringify(tags || []),
      JSON.stringify(photos || existing.photos),
      existing.is_favorite, existing.is_draft, now,
      existing.id,
    );
    const updated = memoryQueries.getById.get(existing.id) as any;
    if (targetTheme) {
      setSetting('theme', targetTheme);
    }
    return res.json({ success: true, memory: rowToMemory(updated), updated: true });
  }

  const id = generateId('mem');
  memoryQueries.insert.run(
    id, date, title, note, flowerId,
    mood || null, weather || null, music || null,
    JSON.stringify(tags || []),
    JSON.stringify(photos || []),
    0, isDraft ? 1 : 0,
    now, now,
  );

  const created = memoryQueries.getById.get(id) as any;
  if (targetTheme && !isDraft) {
    setSetting('theme', targetTheme);
  }
  res.json({ success: true, memory: rowToMemory(created) });
});

app.put('/api/memories/:id', protect, (req, res) => {
  const { id } = req.params;
  const existing = memoryQueries.getById.get(id) as any;
  if (!existing) return res.status(404).json({ error: 'Memory not found' });

  const parse = MemoryUpdateSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Validation failed', details: parse.error.flatten() });
  }

  const data = parse.data;
  const now = new Date().toISOString();

  memoryQueries.update.run(
    data.date ?? existing.date,
    data.title ?? existing.title,
    data.note ?? existing.note,
    data.flowerId ?? existing.flower_id,
    data.mood ?? existing.mood,
    data.weather ?? existing.weather,
    data.music ?? existing.music,
    JSON.stringify(data.tags ?? JSON.parse(existing.tags || '[]')),
    JSON.stringify(data.photos ?? JSON.parse(existing.photos || '[]')),
    data.isFavorite !== undefined ? (data.isFavorite ? 1 : 0) : existing.is_favorite,
    data.isDraft !== undefined ? (data.isDraft ? 1 : 0) : existing.is_draft,
    now, id,
  );

  const updated = memoryQueries.getById.get(id) as any;

  // Auto theme update
  const activeFlowerId = data.flowerId ?? existing.flower_id;
  const isDraftState = data.isDraft !== undefined ? data.isDraft : existing.is_draft;
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
    setSetting('theme', targetTheme);
  }

  res.json({ success: true, memory: rowToMemory(updated) });
});

app.post('/api/memories/:id/delete', protect, (req, res) => {
  const { id } = req.params;
  const existing = memoryQueries.getById.get(id);
  if (!existing) return res.status(404).json({ error: 'Memory not found' });
  memoryQueries.delete.run(id);
  res.json({ success: true });
});

app.post('/api/memories/:id/toggle-favorite', protect, (req, res) => {
  const { id } = req.params;
  const existing = memoryQueries.getById.get(id) as any;
  if (!existing) return res.status(404).json({ error: 'Memory not found' });
  memoryQueries.toggleFavorite.run(new Date().toISOString(), id);
  const updated = memoryQueries.getById.get(id) as any;
  res.json({ success: true, isFavorite: Boolean(updated.is_favorite) });
});

// ── Reminders ─────────────────────────────────────────────────────────────────
app.get('/api/reminders', (req, res) => {
  const rows = reminderQueries.getAll.all() as any[];
  res.json(rows.map(rowToReminder));
});

app.post('/api/reminders', protect, (req, res) => {
  const parse = ReminderSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Validation failed', details: parse.error.flatten() });
  }
  const { title, time, date, repeat, type } = parse.data;
  const id = generateId('rem');
  const now = new Date().toISOString();

  reminderQueries.insert.run(id, title, time, date || null, repeat, type, 1, now);
  const created = reminderQueries.getById.get(id) as any;
  res.json({ success: true, reminder: rowToReminder(created) });
});

app.put('/api/reminders/:id', protect, (req, res) => {
  const { id } = req.params;
  const existing = reminderQueries.getById.get(id) as any;
  if (!existing) return res.status(404).json({ error: 'Reminder not found' });

  const parse = ReminderSchema.partial().safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Validation failed', details: parse.error.flatten() });
  }

  const data = parse.data;
  reminderQueries.update.run(
    data.title ?? existing.title,
    data.time ?? existing.time,
    data.date ?? existing.date,
    data.repeat ?? existing.repeat,
    data.type ?? existing.type,
    data.isActive !== undefined ? (data.isActive ? 1 : 0) : existing.is_active,
    id,
  );

  const updated = reminderQueries.getById.get(id) as any;
  res.json({ success: true, reminder: rowToReminder(updated) });
});

app.delete('/api/reminders/:id', protect, (req, res) => {
  const { id } = req.params;
  const existing = reminderQueries.getById.get(id);
  if (!existing) return res.status(404).json({ error: 'Reminder not found' });
  reminderQueries.delete.run(id);
  res.json({ success: true });
});

// ── Backup / Export ───────────────────────────────────────────────────────────
app.get('/api/backup/export', protect, requireAdmin, (req, res) => {
  const memories = (memoryQueries.getAll.all() as any[]).map(rowToMemory);
  const reminders = (reminderQueries.getAll.all() as any[]).map(rowToReminder);
  res.json({
    version: '2.0',
    exportedAt: new Date().toISOString(),
    memories,
    reminders,
    settings: {
      theme: getSetting('theme'),
      title: getSetting('title'),
    },
  });
});

app.post('/api/backup/restore', protect, requireAdmin, (req, res) => {
  const { memories, reminders } = req.body;
  if (!Array.isArray(memories) || !Array.isArray(reminders)) {
    return res.status(400).json({ error: 'Invalid backup format: memories and reminders must be arrays' });
  }

  // Restore memories
  for (const m of memories) {
    const parse = MemoryCreateSchema.safeParse(m);
    if (!parse.success) continue;
    const d = parse.data;
    try {
      memoryQueries.insert.run(
        m.id || generateId('mem'), d.date, d.title, d.note, d.flowerId,
        d.mood || null, d.weather || null, d.music || null,
        JSON.stringify(d.tags || []), JSON.stringify(d.photos || []),
        m.isFavorite ? 1 : 0, m.isDraft ? 1 : 0,
        m.createdAt || new Date().toISOString(), new Date().toISOString(),
      );
    } catch { /* skip duplicates */ }
  }

  res.json({ success: true, imported: { memories: memories.length, reminders: reminders.length } });
});

// ── Gemini AI Quotes ──────────────────────────────────────────────────────────
app.post('/api/gemini/quote', protect, async (req, res) => {
  const { mood, flowerName } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  const fallbacks = [
    { quote: 'Love is a garden where sweet memories quietly bloom day by day.', sentiment: 'The rose tells a story of endless devotion.' },
    { quote: 'Every shared laugh becomes a flower that never fades.', sentiment: 'Sunflowers follow your golden smile.' },
    { quote: 'In the quiet corners of my heart, you blossom eternally.', sentiment: 'Cherry blossoms carry our gentle promises.' },
    { quote: 'Peace is holding your hand under the autumn stars.', sentiment: 'Lavender whispers sweet, calming melodies.' },
  ];

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return res.json(fallbacks[Math.floor(Math.random() * fallbacks.length)]);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'bloom-diary' } },
    });

    const prompt = `Write an extremely romantic, heartwarming, poetic quote about love, memories, and flowers.
${mood ? `The current mood is: '${mood}'.` : ''}
${flowerName ? `The selected flower is: '${flowerName}'.` : ''}
Provide an ultra-short poetic quote (max 15 words) that warms the heart, and a matching romantic sentiment (max 20 words).`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            quote: { type: Type.STRING, description: 'Ultra-short poetic quote (max 15 words).' },
            sentiment: { type: Type.STRING, description: 'Romantic sentiment for the flower (max 20 words).' },
          },
          required: ['quote', 'sentiment'],
        },
      },
    });

    const raw = (response.text || '').trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    return res.json(JSON.parse(raw));
  } catch (err) {
    console.error('Gemini quote error:', err);
    return res.json(fallbacks[Math.floor(Math.random() * fallbacks.length)]);
  }
});

// ─── Local Photo Upload Support ──────────────────────────────────────────────
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

app.post('/api/upload', protect, upload.single('photo'), (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, url: fileUrl });
});

// ─── Frontend Serving ─────────────────────────────────────────────────────────
async function startServer() {
  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🌸 Bloom Diary v2.0 running on http://localhost:${PORT}`);
    console.log(`   Database: SQLite (WAL mode)`);
    console.log(`   Security: JWT + bcrypt + Helmet + Rate Limiting\n`);
  });
}

startServer();
