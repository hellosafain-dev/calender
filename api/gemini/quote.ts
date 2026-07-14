import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';
import { requireAuth } from '../../lib/vercel-auth.js';

const FALLBACKS = [
  { quote: 'Love is a garden where sweet memories quietly bloom day by day.', sentiment: 'The rose tells a story of endless devotion.' },
  { quote: 'Every shared laugh becomes a flower that never fades.', sentiment: 'Sunflowers follow your golden smile.' },
  { quote: 'In the quiet corners of my heart, you blossom eternally.', sentiment: 'Cherry blossoms carry our gentle promises.' },
  { quote: 'Peace is holding your hand under the autumn stars.', sentiment: 'Lavender whispers sweet, calming melodies.' },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = requireAuth(req, res);
  if (!user) return;

  const { mood, flowerName } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return res.json(FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)]);
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
    return res.json(FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)]);
  }
}
