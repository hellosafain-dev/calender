/**
 * SQLite Database Layer for Bloom Diary
 * Replaces the fragile db.json flat-file with a proper ACID-compliant database.
 * Uses WAL mode for safe concurrent reads.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { Memory, Reminder, ThemeType } from '../types.js';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'bloom.db');
const JSON_PATH = path.join(DB_DIR, 'db.json');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Performance + safety optimizations
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

// ─── Schema ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS memories (
    id          TEXT PRIMARY KEY,
    date        TEXT NOT NULL,
    title       TEXT NOT NULL,
    note        TEXT NOT NULL,
    flower_id   TEXT NOT NULL,
    mood        TEXT,
    weather     TEXT,
    music       TEXT,
    tags        TEXT NOT NULL DEFAULT '[]',
    photos      TEXT NOT NULL DEFAULT '[]',
    is_favorite INTEGER NOT NULL DEFAULT 0,
    is_draft    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    time       TEXT NOT NULL,
    date       TEXT,
    repeat     TEXT NOT NULL,
    type       TEXT NOT NULL,
    is_active  INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS habits (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    flower_id       TEXT NOT NULL,
    frequency       TEXT NOT NULL,
    completed_dates TEXT NOT NULL DEFAULT '[]',
    streak          INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS goals (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    description  TEXT,
    deadline     TEXT,
    category     TEXT NOT NULL,
    progress     INTEGER NOT NULL DEFAULT 0,
    is_completed INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS planner_tasks (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    period       TEXT NOT NULL,
    order_index  INTEGER NOT NULL,
    is_completed INTEGER NOT NULL DEFAULT 0,
    date         TEXT NOT NULL,
    created_at   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS journal_entries (
    id         TEXT PRIMARY KEY,
    date       TEXT NOT NULL,
    prompt     TEXT,
    content    TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notes (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    content    TEXT NOT NULL,
    folder     TEXT NOT NULL DEFAULT 'Personal',
    is_pinned  INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_memories_date ON memories(date);
  CREATE INDEX IF NOT EXISTS idx_memories_favorite ON memories(is_favorite);
  CREATE INDEX IF NOT EXISTS idx_reminders_active ON reminders(is_active);
  CREATE INDEX IF NOT EXISTS idx_planner_tasks_date ON planner_tasks(date);
  CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date);
`);

// ─── Row Converters ───────────────────────────────────────────────────────────
export function rowToMemory(row: any): Memory {
  return {
    id: row.id,
    date: row.date,
    title: row.title,
    note: row.note,
    flowerId: row.flower_id,
    mood: row.mood,
    weather: row.weather,
    music: row.music,
    tags: JSON.parse(row.tags || '[]'),
    photos: JSON.parse(row.photos || '[]'),
    isFavorite: Boolean(row.is_favorite),
    isDraft: Boolean(row.is_draft),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToReminder(row: any): Reminder {
  return {
    id: row.id,
    title: row.title,
    time: row.time,
    date: row.date || undefined,
    repeat: row.repeat as Reminder['repeat'],
    type: row.type as Reminder['type'],
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
  };
}

// ─── Seeding / Migration ──────────────────────────────────────────────────────
const settingsCount = (db.prepare('SELECT COUNT(*) as c FROM settings').get() as any).c;

if (settingsCount === 0) {
  console.log('🌱 Initializing Bloom Diary database...');

  let seedData: any = null;

  // Try to migrate from existing db.json
  if (fs.existsSync(JSON_PATH)) {
    try {
      seedData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
      console.log('📦 Migrating data from db.json → bloom.db');
    } catch {
      console.warn('⚠️  Could not parse db.json, using default seed data');
    }
  }

  // Default memories if no migration source
  const defaultMemories = [
    {
      id: 'mem-1', date: '2025-10-18', title: 'The Day It All Began',
      note: 'We met under the gentle autumn rain, sharing an umbrella and a warm cup of coffee. Time seemed to slow down as we talked for hours about our favorite books and songs. I knew right then that my life was about to change beautifully.',
      flowerId: 'rose', mood: 'romantic', weather: 'rainy', music: 'Autumn Leaves - Edith Piaf',
      tags: ['first-meeting', 'rainy-day', 'beginning'], photos: ['https://picsum.photos/seed/rose_garden/800/600'],
      isFavorite: true, isDraft: false, createdAt: '2025-10-18T18:30:00.000Z', updatedAt: '2025-10-18T18:30:00.000Z',
    },
    {
      id: 'mem-2', date: '2025-11-11', title: 'Warm Cocoa & Laughter',
      note: 'A chilly evening spent inside making hot cocoa with extra marshmallows. We built a small blanket fort in the living room and watched old black-and-white films. Every laugh shared felt like a warm fire.',
      flowerId: 'peony', mood: 'calm', weather: 'windy', music: 'Cozy Winter - Lofi Cafe',
      tags: ['home', 'cocoa', 'comfort'], photos: ['https://picsum.photos/seed/hot_cocoa/800/600'],
      isFavorite: false, isDraft: false, createdAt: '2025-11-11T20:45:00.000Z', updatedAt: '2025-11-11T20:45:00.000Z',
    },
    {
      id: 'mem-best-life', date: '2025-12-30', title: 'The Best Memory of My Life ✨',
      note: 'A night of absolute magic under a canopy of warm, twinkling winter lights. We walked hand-in-hand as gentle snow began to fall, turning the world into a quiet, frozen fairytale.',
      flowerId: 'peony', mood: 'grateful', weather: 'snowy', music: 'Perfect - Ed Sheeran',
      tags: ['best-day', 'forever', 'magical-night'], photos: ['https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=1000'],
      isFavorite: true, isDraft: false, createdAt: '2025-12-30T21:00:00.000Z', updatedAt: '2025-12-30T21:00:00.000Z',
    },
    {
      id: 'mem-3', date: '2026-02-14', title: "Valentine's Secret Picnic",
      note: 'I surprised her with a secret picnic by the glasshouse. The spring flowers were just starting to open, casting a soft scent through the breeze.',
      flowerId: 'tulip', mood: 'joyful', weather: 'sunny', music: 'La Vie En Rose - Louis Armstrong',
      tags: ['valentines', 'picnic', 'surprise'], photos: ['https://picsum.photos/seed/picnic/800/600'],
      isFavorite: true, isDraft: false, createdAt: '2026-02-14T12:00:00.000Z', updatedAt: '2026-02-14T12:00:00.000Z',
    },
    {
      id: 'mem-4', date: '2026-05-10', title: 'Midnight Stargazing',
      note: 'We drove up to the scenic overlook at 2 AM to watch the Lyrid meteor shower. Wrapped in a giant wool blanket, we saw five shooting stars.',
      flowerId: 'lavender', mood: 'peaceful', weather: 'cloudy', music: 'Clair de Lune - Debussy',
      tags: ['stars', 'night-drive', 'peace'], photos: ['https://picsum.photos/seed/stars_night/800/600'],
      isFavorite: false, isDraft: false, createdAt: '2026-05-10T02:00:00.000Z', updatedAt: '2026-05-10T02:00:00.000Z',
    },
    {
      id: 'mem-5', date: '2026-06-20', title: 'Golden Hour Sunset Walk',
      note: 'Walking along the golden shore as the sun dipped below the water. The sky was an endless canvas of soft pinks, deep lavenders, and burning golds.',
      flowerId: 'sunflower', mood: 'grateful', weather: 'sunny', music: 'Sunset Lover - Petit Biscuit',
      tags: ['sunset', 'beach', 'golden-hour'], photos: ['https://picsum.photos/seed/sunset_love/800/600'],
      isFavorite: true, isDraft: false, createdAt: '2026-06-20T19:15:00.000Z', updatedAt: '2026-06-20T19:15:00.000Z',
    },
    {
      id: 'mem-6', date: '2026-07-14', title: 'Bloom Diary is Born',
      note: 'Today we launched our sacred Bloom Diary. A private sanctuary where every memory of ours turns into a flower, creating a garden that will bloom and grow beautifully for many years to come.',
      flowerId: 'cherry_blossom', mood: 'nostalgic', weather: 'sunny', music: 'Bloom - The Paper Kites',
      tags: ['launch', 'sanctuary', 'bloom'], photos: ['https://picsum.photos/seed/bloom_flowers/800/600'],
      isFavorite: true, isDraft: false, createdAt: '2026-07-14T10:00:00.000Z', updatedAt: '2026-07-14T10:00:00.000Z',
    },
  ];

  const memories = seedData?.memories || defaultMemories;
  const reminders = seedData?.reminders || [];
  const settings = seedData?.settings || {};

  // Seed memories
  const insertMemory = db.prepare(`
    INSERT OR IGNORE INTO memories
      (id, date, title, note, flower_id, mood, weather, music, tags, photos, is_favorite, is_draft, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedMemoriesTx = db.transaction((items: any[]) => {
    for (const m of items) {
      insertMemory.run(
        m.id, m.date, m.title, m.note,
        m.flowerId || m.flower_id,
        m.mood || null, m.weather || null, m.music || null,
        JSON.stringify(m.tags || []),
        JSON.stringify(m.photos || []),
        m.isFavorite ? 1 : 0,
        m.isDraft ? 1 : 0,
        m.createdAt, m.updatedAt,
      );
    }
  });
  seedMemoriesTx(memories);

  // Seed reminders
  if (reminders.length > 0) {
    const insertReminder = db.prepare(`
      INSERT OR IGNORE INTO reminders (id, title, time, date, repeat, type, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const r of reminders) {
      insertReminder.run(r.id, r.title, r.time, r.date || null, r.repeat, r.type, r.isActive ? 1 : 0, r.createdAt);
    }
  }

  // Seed settings — hash passwords on first init
  const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

  let adminPass = settings.passwordHash || 'bloom123';
  let viewerPass = settings.viewerPasswordHash || 'love123';

  if (!adminPass.startsWith('$2')) adminPass = bcrypt.hashSync(adminPass, 10);
  if (!viewerPass.startsWith('$2')) viewerPass = bcrypt.hashSync(viewerPass, 10);

  insertSetting.run('theme', settings.theme || 'elegant_dark');
  insertSetting.run('title', settings.title || 'Bloom Diary');
  insertSetting.run('admin_password', adminPass);
  insertSetting.run('viewer_password', viewerPass);

  console.log('✅ Bloom Diary database ready!');
}

// ─── Prepared Statements ──────────────────────────────────────────────────────
export const memoryQueries = {
  getAll: db.prepare('SELECT * FROM memories ORDER BY date ASC'),
  getById: db.prepare('SELECT * FROM memories WHERE id = ?'),
  getByDate: db.prepare('SELECT * FROM memories WHERE date = ?'),
  getPaginated: db.prepare('SELECT * FROM memories ORDER BY date ASC LIMIT ? OFFSET ?'),
  count: db.prepare('SELECT COUNT(*) as total FROM memories'),

  insert: db.prepare(`
    INSERT INTO memories
      (id, date, title, note, flower_id, mood, weather, music, tags, photos, is_favorite, is_draft, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  update: db.prepare(`
    UPDATE memories SET
      date=?, title=?, note=?, flower_id=?, mood=?, weather=?, music=?,
      tags=?, photos=?, is_favorite=?, is_draft=?, updated_at=?
    WHERE id=?
  `),

  delete: db.prepare('DELETE FROM memories WHERE id = ?'),
  toggleFavorite: db.prepare('UPDATE memories SET is_favorite = NOT is_favorite, updated_at = ? WHERE id = ?'),
  getIsFavorite: db.prepare('SELECT is_favorite FROM memories WHERE id = ?'),
};

export const reminderQueries = {
  getAll: db.prepare('SELECT * FROM reminders ORDER BY created_at ASC'),
  getById: db.prepare('SELECT * FROM reminders WHERE id = ?'),

  insert: db.prepare(`
    INSERT INTO reminders (id, title, time, date, repeat, type, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),

  update: db.prepare(`
    UPDATE reminders SET title=?, time=?, date=?, repeat=?, type=?, is_active=?
    WHERE id=?
  `),

  delete: db.prepare('DELETE FROM reminders WHERE id = ?'),
};

export const settingQueries = {
  get: db.prepare('SELECT value FROM settings WHERE key = ?'),
  set: db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'),
  getAll: db.prepare('SELECT key, value FROM settings'),
};

export function getSetting(key: string): string | null {
  const row = settingQueries.get.get(key) as any;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  settingQueries.set.run(key, value);
}

export const habitQueries = {
  getAll: db.prepare('SELECT * FROM habits ORDER BY created_at ASC'),
  getById: db.prepare('SELECT * FROM habits WHERE id = ?'),
  insert: db.prepare('INSERT INTO habits (id, title, flower_id, frequency, completed_dates, streak, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  update: db.prepare('UPDATE habits SET title=?, flower_id=?, frequency=?, completed_dates=?, streak=? WHERE id=?'),
  delete: db.prepare('DELETE FROM habits WHERE id = ?'),
};

export const goalQueries = {
  getAll: db.prepare('SELECT * FROM goals ORDER BY created_at ASC'),
  getById: db.prepare('SELECT * FROM goals WHERE id = ?'),
  insert: db.prepare('INSERT INTO goals (id, title, description, deadline, category, progress, is_completed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
  update: db.prepare('UPDATE goals SET title=?, description=?, deadline=?, category=?, progress=?, is_completed=? WHERE id=?'),
  delete: db.prepare('DELETE FROM goals WHERE id = ?'),
};

export const plannerQueries = {
  getAll: db.prepare('SELECT * FROM planner_tasks ORDER BY order_index ASC'),
  getByDate: db.prepare('SELECT * FROM planner_tasks WHERE date = ? ORDER BY order_index ASC'),
  getById: db.prepare('SELECT * FROM planner_tasks WHERE id = ?'),
  insert: db.prepare('INSERT INTO planner_tasks (id, title, period, order_index, is_completed, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  update: db.prepare('UPDATE planner_tasks SET title=?, period=?, order_index=?, is_completed=?, date=? WHERE id=?'),
  delete: db.prepare('DELETE FROM planner_tasks WHERE id = ?'),
};

export const journalQueries = {
  getAll: db.prepare('SELECT * FROM journal_entries ORDER BY date DESC'),
  getById: db.prepare('SELECT * FROM journal_entries WHERE id = ?'),
  insert: db.prepare('INSERT INTO journal_entries (id, date, prompt, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'),
  update: db.prepare('UPDATE journal_entries SET date=?, prompt=?, content=?, updated_at=? WHERE id=?'),
  delete: db.prepare('DELETE FROM journal_entries WHERE id = ?'),
};

export const noteQueries = {
  getAll: db.prepare('SELECT * FROM notes ORDER BY updated_at DESC'),
  getById: db.prepare('SELECT * FROM notes WHERE id = ?'),
  insert: db.prepare('INSERT INTO notes (id, title, content, folder, is_pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  update: db.prepare('UPDATE notes SET title=?, content=?, folder=?, is_pinned=?, updated_at=? WHERE id=?'),
  delete: db.prepare('DELETE FROM notes WHERE id = ?'),
};

export default db;
