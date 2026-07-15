import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';
import { requireAuth } from '../../lib/vercel-auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = requireAuth(req, res);
  if (!user) return;

  const { input } = req.body;
  if (!input || typeof input !== 'string') return res.status(400).json({ error: 'input is required' });

  const apiKey = process.env.GEMINI_API_KEY;
  const today = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  const fallback = {
    title: input.slice(0, 60),
    time: '09:00',
    date: null,
    repeat: 'none',
    type: 'custom',
    suggestion: `Set "${input.slice(0, 40)}..." as a reminder.`,
  };

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return res.json(fallback);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Today is ${today}. Current time is ${nowTime}.
The user wants to set a personal reminder with this message: "${input}"

Extract the reminder details and return JSON:
- title: short reminder title (max 60 chars, friendly and warm)
- time: 24-hour format HH:MM (infer from message, default to 09:00 if not specified)
- date: YYYY-MM-DD or null if recurring/no specific date
- repeat: one of [none, daily, weekly, monthly, yearly]
- type: one of [anniversary, birthday, prayer, medicine, custom]
- suggestion: one encouraging, warm sentence about why this reminder matters

Be smart about inferring:
- "every day" → repeat: daily
- "every week" → repeat: weekly
- "birthday" → type: birthday
- "anniversary" → type: anniversary
- "medicine/tablet/pill" → type: medicine
- "prayer/namaz/salah" → type: prayer
- morning → 08:00, afternoon → 14:00, evening → 18:00, night → 21:00`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            time: { type: Type.STRING },
            date: { type: Type.STRING, nullable: true },
            repeat: { type: Type.STRING },
            type: { type: Type.STRING },
            suggestion: { type: Type.STRING },
          },
          required: ['title', 'time', 'repeat', 'type', 'suggestion'],
        },
      },
    });

    const raw = (response.text || '').trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    return res.json(JSON.parse(raw));
  } catch (err) {
    console.error('Gemini smart-reminder error:', err);
    return res.json(fallback);
  }
}
