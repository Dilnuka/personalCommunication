import jwt from 'jsonwebtoken';
import db from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = verifyToken(header.slice(7));
    const user = await db.get('SELECT id FROM users WHERE id = ?', [payload.userId]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export async function socketAuth(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const payload = verifyToken(token);
    const user = await db.get('SELECT id FROM users WHERE id = ?', [payload.userId]);
    if (!user) {
      return next(new Error('Invalid or expired token'));
    }
    socket.userId = payload.userId;
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
}
