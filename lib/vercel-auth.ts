/**
 * JWT Auth helpers for Vercel serverless functions
 */
import jwt from 'jsonwebtoken';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const JWT_SECRET = process.env.JWT_SECRET || 'bloom-diary-dev-secret-change-in-production-32chars';

export interface JwtPayload {
  role: 'admin' | 'viewer';
  username: string;
  iat?: number;
  exp?: number;
}

export function verifyToken(req: VercelRequest): JwtPayload | null {
  const authHeader = req.headers['authorization'] as string | undefined;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function requireAuth(req: VercelRequest, res: VercelResponse): JwtPayload | null {
  const user = verifyToken(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized: No valid token provided' });
    return null;
  }
  return user;
}

export function requireAdmin(req: VercelRequest, res: VercelResponse): JwtPayload | null {
  const user = requireAuth(req, res);
  if (!user) return null;
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return null;
  }
  return user;
}

export function allowMethods(res: VercelResponse, methods: string[]): boolean {
  return true; // Vercel handles CORS, method validation done per-handler
}
