/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Memory {
  id: string; // UUID
  date: string; // YYYY-MM-DD
  title: string;
  note: string; // Markdown supported
  flowerId: string; // rose, tulip, lavender, sunflower, cherry_blossom, jasmine, hydrangea, peony
  mood: string; // peaceful, joyful, nostalgic, romantic, grateful, calm
  weather?: string; // sunny, rainy, cloudy, snowy, windy
  music?: string; // song name / mood music
  tags: string[];
  photos: string[]; // base64 or static URLs of images
  isFavorite: boolean;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Flower {
  id: string;
  name: string;
  emotion: string;
  color: string; // Tailwind color class or hex
  gradient: string; // Tailwind gradient classes
  emoji: string;
  symbol: string; // Unicode or special SVG reference
  meaning: string;
}

export interface Reminder {
  id: string;
  title: string;
  time: string; // HH:MM
  date?: string; // Optional for one-time or specific date (e.g., anniversary)
  repeat: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  type: 'anniversary' | 'birthday' | 'prayer' | 'medicine' | 'custom';
  isActive: boolean;
  createdAt: string;
}

export type ThemeType = 'light' | 'dark' | 'autumn' | 'spring' | 'lavender' | 'cherry' | 'forest' | 'ocean' | 'elegant_dark' | 'rapunzel' | 'barbie' | 'oswald' | 'butterfly' | 'sunshine' | 'gilded_rose' | 'midnight_forest' | 'cosmic_stardust';

export interface UserSession {
  role: 'admin' | 'viewer' | null;
  username: string | null;
}

export interface Habit {
  id: string;
  title: string;
  flowerId: string;
  frequency: 'daily' | 'weekly';
  completedDates: string[]; // YYYY-MM-DD format
  streak: number;
  createdAt: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  deadline?: string; // YYYY-MM-DD
  category: 'personal' | 'learning' | 'health' | 'finance' | 'travel' | 'habit' | 'career';
  progress: number; // 0 to 100
  isCompleted: boolean;
  createdAt: string;
}

export interface PlannerTask {
  id: string;
  title: string;
  period: 'morning' | 'afternoon' | 'evening';
  orderIndex: number;
  isCompleted: boolean;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  prompt?: string;
  content: string; // Markdown supported
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folder: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DbSchema {
  memories: Memory[];
  reminders: Reminder[];
  habits: Habit[];
  goals: Goal[];
  plannerTasks: PlannerTask[];
  journalEntries: JournalEntry[];
  notes: Note[];
  settings: {
    theme: ThemeType;
    passwordHash: string;
    viewerPasswordHash: string;
    title: string;
  };
}
