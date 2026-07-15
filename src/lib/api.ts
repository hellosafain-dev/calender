/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Memory, Reminder, ThemeType } from '../types.js';
import { getToken, setToken, saveSession, clearToken, getSession, Session } from './auth.js';

export type { Session };
export { getSession, clearToken as clearSession };

const BASE_URL = '';

async function resilientFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  retries = 3,
  delay = 800
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(input, init);
      if (response.status === 401) {
        clearToken();
        return response;
      }
      if (response.status === 502 || response.status === 503 || response.status === 504) {
        throw new Error(`Server error: ${response.status}`);
      }
      return response;
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`ResilientFetch: Retrying in ${delay}ms... (${i + 1}/${retries})`, err);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  return fetch(input, init);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export const API = {
  async login(password: string): Promise<{ success: boolean; role?: 'admin' | 'viewer'; username?: string; token?: string; error?: string }> {
    const res = await resilientFetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (res.ok && data.success && data.token) {
      setToken(data.token);
      saveSession({ role: data.role, username: data.username });
    }
    return data;
  },

  async getSettings(): Promise<{ theme: ThemeType; title: string; autoCycle?: boolean; hasAdminPassword?: boolean; hasViewerPassword?: boolean }> {
    const res = await resilientFetch(`${BASE_URL}/api/settings`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load settings');
    return res.json();
  },

  async updateSettings(settings: { theme?: ThemeType; title?: string; passwordHash?: string; viewerPasswordHash?: string; autoCycle?: boolean }): Promise<any> {
    const res = await resilientFetch(`${BASE_URL}/api/settings`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  async getMemories(page = 1, limit = 100): Promise<Memory[]> {
    const res = await resilientFetch(`${BASE_URL}/api/memories?page=${page}&limit=${limit}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load memories');
    const data = await res.json();
    return Array.isArray(data) ? data : (data.data || []);
  },

  async createMemory(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt' | 'isFavorite'>): Promise<{ success: boolean; memory: Memory }> {
    const res = await resilientFetch(`${BASE_URL}/api/memories`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(memory),
    });
    if (!res.ok) throw new Error('Failed to create memory');
    return res.json();
  },

  async updateMemory(id: string, memory: Partial<Memory>): Promise<{ success: boolean; memory: Memory }> {
    const res = await resilientFetch(`${BASE_URL}/api/memories/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(memory),
    });
    if (!res.ok) throw new Error('Failed to update memory');
    return res.json();
  },

  async deleteMemory(id: string): Promise<{ success: boolean }> {
    const res = await resilientFetch(`${BASE_URL}/api/memories/${id}/delete`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete memory');
    return res.json();
  },

  async toggleFavorite(id: string): Promise<{ success: boolean; isFavorite: boolean }> {
    const res = await resilientFetch(`${BASE_URL}/api/memories/${id}/toggle-favorite`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to toggle favorite');
    return res.json();
  },

  async getReminders(): Promise<Reminder[]> {
    const res = await resilientFetch(`${BASE_URL}/api/reminders`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load reminders');
    return res.json();
  },

  async createReminder(reminder: Omit<Reminder, 'id' | 'createdAt' | 'isActive'>): Promise<{ success: boolean; reminder: Reminder }> {
    const res = await resilientFetch(`${BASE_URL}/api/reminders`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(reminder),
    });
    if (!res.ok) throw new Error('Failed to create reminder');
    return res.json();
  },

  async updateReminder(id: string, reminder: Partial<Reminder>): Promise<{ success: boolean; reminder: Reminder }> {
    const res = await resilientFetch(`${BASE_URL}/api/reminders/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(reminder),
    });
    if (!res.ok) throw new Error('Failed to update reminder');
    return res.json();
  },

  async deleteReminder(id: string): Promise<{ success: boolean }> {
    const res = await resilientFetch(`${BASE_URL}/api/reminders/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete reminder');
    return res.json();
  },

  async getGeminiQuote(mood?: string, flowerName?: string): Promise<{ quote: string; sentiment: string }> {
    const res = await resilientFetch(`${BASE_URL}/api/gemini/quote`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ mood, flowerName }),
    });
    if (!res.ok) {
      return { quote: 'Love is a garden where sweet memories quietly bloom day by day.', sentiment: 'The rose tells a story of endless devotion.' };
    }
    return res.json();
  },

  // ─── Image Compression ──────────────────────────────────────────────────────
  async compressImage(base64Str: string, maxWidth = 1200, quality = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(base64Str);

        ctx.drawImage(img, 0, 0, width, height);
        // Force JPEG for maximum compression
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(base64Str); // Fallback to original if error
    });
  },

  async uploadPhoto(base64File: string, name: string): Promise<{ success: boolean; url: string }> {
    // Compress image to comfortably store 1000+ images in the 1GB free tier
    const compressedBase64 = await this.compressImage(base64File);

    const res = await resilientFetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ file: compressedBase64, name }),
    });
    if (!res.ok) throw new Error('Failed to upload photo');
    return res.json();
  },

  // ─── Companion APIs ─────────────────────────────────────────────────────────
  async getHabits(): Promise<any[]> {
    const res = await resilientFetch(`${BASE_URL}/api/habits`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load habits');
    return res.json();
  },
  async createHabit(habit: any): Promise<any> {
    const res = await resilientFetch(`${BASE_URL}/api/habits`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(habit) });
    return res.json();
  },
  async updateHabit(id: string, habit: any): Promise<any> {
    const res = await resilientFetch(`${BASE_URL}/api/habits`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ id, ...habit }) });
    return res.json();
  },
  async deleteHabit(id: string): Promise<any> {
    const res = await resilientFetch(`${BASE_URL}/api/habits?id=${id}`, { method: 'DELETE', headers: authHeaders() });
    return res.json();
  },

  async getGoals(): Promise<any[]> {
    const res = await resilientFetch(`${BASE_URL}/api/goals`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load goals');
    return res.json();
  },
  async createGoal(goal: any): Promise<any> {
    const res = await resilientFetch(`${BASE_URL}/api/goals`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(goal) });
    return res.json();
  },
  async updateGoal(id: string, goal: any): Promise<any> {
    const res = await resilientFetch(`${BASE_URL}/api/goals`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ id, ...goal }) });
    return res.json();
  },
  async deleteGoal(id: string): Promise<any> {
    const res = await resilientFetch(`${BASE_URL}/api/goals?id=${id}`, { method: 'DELETE', headers: authHeaders() });
    return res.json();
  },

  async getPlannerTasks(date?: string): Promise<any[]> {
    const url = date ? `${BASE_URL}/api/planner?date=${date}` : `${BASE_URL}/api/planner`;
    const res = await resilientFetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load planner tasks');
    return res.json();
  },
  async createPlannerTask(task: any): Promise<any> {
    const res = await resilientFetch(`${BASE_URL}/api/planner`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(task) });
    return res.json();
  },
  async updatePlannerTask(id: string, task: any): Promise<any> {
    const res = await resilientFetch(`${BASE_URL}/api/planner`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ id, ...task }) });
    return res.json();
  },
  async deletePlannerTask(id: string): Promise<any> {
    const res = await resilientFetch(`${BASE_URL}/api/planner?id=${id}`, { method: 'DELETE', headers: authHeaders() });
    return res.json();
  },

  async getJournalEntries(): Promise<any[]> {
    const res = await resilientFetch(`${BASE_URL}/api/journal`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load journal');
    return res.json();
  },
  async createJournalEntry(entry: any): Promise<any> {
    const res = await resilientFetch(`${BASE_URL}/api/journal`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(entry) });
    return res.json();
  },
  async updateJournalEntry(id: string, entry: any): Promise<any> {
    const res = await resilientFetch(`${BASE_URL}/api/journal`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ id, ...entry }) });
    return res.json();
  },
  async deleteJournalEntry(id: string): Promise<any> {
    const res = await resilientFetch(`${BASE_URL}/api/journal?id=${id}`, { method: 'DELETE', headers: authHeaders() });
    return res.json();
  },

  async getNotes(): Promise<any[]> {
    const res = await resilientFetch(`${BASE_URL}/api/notes`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load notes');
    return res.json();
  },
  async createNote(note: any): Promise<any> {
    const res = await resilientFetch(`${BASE_URL}/api/notes`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(note) });
    return res.json();
  },
  async updateNote(id: string, note: any): Promise<any> {
    const res = await resilientFetch(`${BASE_URL}/api/notes`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ id, ...note }) });
    return res.json();
  },
  async deleteNote(id: string): Promise<any> {
    const res = await resilientFetch(`${BASE_URL}/api/notes?id=${id}`, { method: 'DELETE', headers: authHeaders() });
    return res.json();
  },

  // ─── Backups ────────────────────────────────────────────────────────────────
  async exportBackup(): Promise<any> {
    const res = await resilientFetch(`${BASE_URL}/api/backup/export`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to export backup');
    return res.json();
  },

  async restoreBackup(dbData: any): Promise<{ success: boolean }> {
    const res = await resilientFetch(`${BASE_URL}/api/backup/restore`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(dbData),
    });
    if (!res.ok) throw new Error('Failed to restore backup');
    return res.json();
  }
};
