-- ============================================================
-- Bloom Diary — Supabase Database Schema
-- Run this SQL in your Supabase project's SQL Editor:
-- Supabase Dashboard → SQL Editor → New Query → paste → Run
-- ============================================================

-- Memories table
CREATE TABLE IF NOT EXISTS memories (
  id          TEXT PRIMARY KEY,
  date        DATE NOT NULL,
  title       TEXT NOT NULL,
  note        TEXT NOT NULL,
  flower_id   TEXT NOT NULL,
  mood        TEXT,
  weather     TEXT,
  music       TEXT,
  tags        TEXT[] DEFAULT '{}',
  photos      TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT FALSE,
  is_draft    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  time       TEXT NOT NULL,
  date       DATE,
  repeat     TEXT NOT NULL CHECK (repeat IN ('none','daily','weekly','monthly','yearly')),
  type       TEXT NOT NULL CHECK (type IN ('anniversary','birthday','prayer','medicine','custom')),
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Settings table (key-value store)
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_memories_date ON memories(date);
CREATE INDEX IF NOT EXISTS idx_memories_favorite ON memories(is_favorite);
CREATE INDEX IF NOT EXISTS idx_reminders_active ON reminders(is_active);

-- ─── Seed Default Settings ────────────────────────────────────────────────────
-- NOTE: Passwords below are bcrypt hashes of 'bloom123' and 'love123'
-- You MUST change these after first login via the Settings page!
INSERT INTO settings (key, value) VALUES
  ('theme', 'elegant_dark'),
  ('title', 'Bloom Diary'),
  ('admin_password', '$2b$10$Ru3xbP9R8E5E.f6zc33oSu2qph7riYh7wMXQO/lC5ZxNqhiuXppIW'),
  ('viewer_password', '$2b$10$UL4KOLe4nuDgmxdxNqRUi.PPlDhbXe1YoV.LUjpEBykAifLLIY2VW')
ON CONFLICT (key) DO NOTHING;

-- ─── Row Level Security (RLS) ─────────────────────────────────────────────────
-- We use server-side JWT auth, so disable RLS (our API functions verify tokens)
ALTER TABLE memories DISABLE ROW LEVEL SECURITY;
ALTER TABLE reminders DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- ─── Seed Sample Memories ────────────────────────────────────────────────────
INSERT INTO memories (id, date, title, note, flower_id, mood, weather, music, tags, photos, is_favorite, is_draft, created_at, updated_at)
VALUES
  ('mem-1', '2025-10-18', 'The Day It All Began',
   'We met under the gentle autumn rain, sharing an umbrella and a warm cup of coffee. Time seemed to slow down as we talked for hours about our favorite books and songs.',
   'rose', 'romantic', 'rainy', 'Autumn Leaves - Edith Piaf',
   ARRAY['first-meeting','rainy-day','beginning'],
   ARRAY['https://picsum.photos/seed/rose_garden/800/600'],
   TRUE, FALSE, '2025-10-18T18:30:00Z', '2025-10-18T18:30:00Z'),

  ('mem-2', '2025-11-11', 'Warm Cocoa & Laughter',
   'A chilly evening spent inside making hot cocoa with extra marshmallows. We built a small blanket fort in the living room and watched old black-and-white films.',
   'peony', 'calm', 'windy', 'Cozy Winter - Lofi Cafe',
   ARRAY['home','cocoa','comfort'],
   ARRAY['https://picsum.photos/seed/hot_cocoa/800/600'],
   FALSE, FALSE, '2025-11-11T20:45:00Z', '2025-11-11T20:45:00Z'),

  ('mem-best-life', '2025-12-30', 'The Best Memory of My Life ✨',
   'A night of absolute magic under a canopy of warm, twinkling winter lights. We walked hand-in-hand as gentle snow began to fall, turning the world into a quiet, frozen fairytale.',
   'peony', 'grateful', 'snowy', 'Perfect - Ed Sheeran',
   ARRAY['best-day','forever','magical-night'],
   ARRAY['https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=1000'],
   TRUE, FALSE, '2025-12-30T21:00:00Z', '2025-12-30T21:00:00Z'),

  ('mem-3', '2026-02-14', 'Valentine''s Secret Picnic',
   'I surprised her with a secret picnic by the glasshouse. The spring flowers were just starting to open, casting a soft scent through the breeze.',
   'tulip', 'joyful', 'sunny', 'La Vie En Rose - Louis Armstrong',
   ARRAY['valentines','picnic','surprise'],
   ARRAY['https://picsum.photos/seed/picnic/800/600'],
   TRUE, FALSE, '2026-02-14T12:00:00Z', '2026-02-14T12:00:00Z'),

  ('mem-4', '2026-05-10', 'Midnight Stargazing',
   'We drove up to the scenic overlook at 2 AM to watch the Lyrid meteor shower. Wrapped in a giant wool blanket, we saw five shooting stars.',
   'lavender', 'peaceful', 'cloudy', 'Clair de Lune - Debussy',
   ARRAY['stars','night-drive','peace'],
   ARRAY['https://picsum.photos/seed/stars_night/800/600'],
   FALSE, FALSE, '2026-05-10T02:00:00Z', '2026-05-10T02:00:00Z'),

  ('mem-5', '2026-06-20', 'Golden Hour Sunset Walk',
   'Walking along the golden shore as the sun dipped below the water. The sky was an endless canvas of soft pinks, deep lavenders, and burning golds.',
   'sunflower', 'grateful', 'sunny', 'Sunset Lover - Petit Biscuit',
   ARRAY['sunset','beach','golden-hour'],
   ARRAY['https://picsum.photos/seed/sunset_love/800/600'],
   TRUE, FALSE, '2026-06-20T19:15:00Z', '2026-06-20T19:15:00Z'),

  ('mem-6', '2026-07-14', 'Bloom Diary is Born',
   'Today we launched our sacred Bloom Diary. A private sanctuary where every memory of ours turns into a flower, creating a garden that will bloom and grow beautifully for many years to come.',
   'cherry_blossom', 'nostalgic', 'sunny', 'Bloom - The Paper Kites',
   ARRAY['launch','sanctuary','bloom'],
   ARRAY['https://picsum.photos/seed/bloom_flowers/800/600'],
   TRUE, FALSE, '2026-07-14T10:00:00Z', '2026-07-14T10:00:00Z')

ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. STORAGE BUCKETS & POLICIES
-- ─────────────────────────────────────────────────────────────────────────────
-- Create the 'photos' and 'memories' buckets for memory images if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('photos', 'photos', true),
  ('memories', 'memories', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to view photos/memories
CREATE POLICY "Public View Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id IN ('photos', 'memories') );

-- Allow unrestricted uploads to the photos and memories buckets (since auth is handled by our Vercel API layer)
CREATE POLICY "Public Upload Access" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id IN ('photos', 'memories') );
