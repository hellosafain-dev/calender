/**
 * Supabase client for Vercel serverless functions (production cloud database)
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Supabase env vars not set — API functions will not work in production. Set SUPABASE_URL and SUPABASE_ANON_KEY.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder',
);

// ─── Type helpers (Supabase snake_case → TypeScript camelCase) ────────────────

export function dbToMemory(row: any) {
  return {
    id: row.id,
    date: row.date,
    title: row.title,
    note: row.note,
    flowerId: row.flower_id,
    mood: row.mood,
    weather: row.weather,
    music: row.music,
    tags: row.tags || [],
    photos: row.photos || [],
    isFavorite: row.is_favorite,
    isDraft: row.is_draft,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function dbToReminder(row: any) {
  return {
    id: row.id,
    title: row.title,
    time: row.time,
    date: row.date || undefined,
    repeat: row.repeat,
    type: row.type,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}
