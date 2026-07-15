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

  async smartReminder(input: string): Promise<{ title: string; time: string; date: string | null; repeat: string; type: string; suggestion: string }> {
    const res = await resilientFetch(`${BASE_URL}/api/gemini/smart-reminder`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ input }),
    });
    if (!res.ok) throw new Error('Smart reminder failed');
    return res.json();
  },

  async uploadPhoto(base64File: string, name: string): Promise<{ success: boolean; url: string }> {
    // Compress the image before uploading to avoid Vercel/Express payload limits
    const compressedBase64 = await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Max dimensions
        const MAX_DIM = 1200;
        if (width > height && width > MAX_DIM) {
          height *= MAX_DIM / width;
          width = MAX_DIM;
        } else if (height > MAX_DIM) {
          width *= MAX_DIM / height;
          height = MAX_DIM;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(base64File); // Fallback
        
        ctx.drawImage(img, 0, 0, width, height);
        // Compress to JPEG at 70% quality
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => resolve(base64File); // Fallback
      img.src = base64File;
    });

    const res = await resilientFetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ file: compressedBase64, name: name.replace(/\.[^/.]+$/, "") + ".jpg" }),
    });
    if (!res.ok) throw new Error('Failed to upload photo');
    return res.json();
  },

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
  },

  async getVapidPublicKey(): Promise<{ publicKey: string }> {
    const res = await resilientFetch(`${BASE_URL}/api/push/vapid-public-key`);
    if (!res.ok) throw new Error('Failed to fetch VAPID key');
    return res.json();
  },

  async subscribePush(subscription: any): Promise<{ success: boolean }> {
    const res = await resilientFetch(`${BASE_URL}/api/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });
    if (!res.ok) throw new Error('Failed to subscribe push');
    return res.json();
  },

  async unsubscribePush(endpoint: string): Promise<{ success: boolean }> {
    const res = await resilientFetch(`${BASE_URL}/api/push/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    });
    if (!res.ok) throw new Error('Failed to unsubscribe push');
    return res.json();
  },
};
