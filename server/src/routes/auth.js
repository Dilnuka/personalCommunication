import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { signToken, authMiddleware } from '../auth.js';
import { isValidAvatarId, randomAvatarId } from '../avatars.js';

const router = Router();

function publicUser(row) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    displayName: row.display_name,
    avatarColor: row.avatar_color,
    avatarId: row.avatar_id || null,
    status: row.status,
    statusMessage: row.status_message,
    createdAt: row.created_at,
  };
}

router.post('/register', async (req, res, next) => {
  const { username, email, password, displayName, avatarId } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#22c55e', '#14b8a6', '#3b82f6'];
  const avatarColor = colors[Math.floor(Math.random() * colors.length)];
  const chosenAvatarId = isValidAvatarId(avatarId) ? avatarId : randomAvatarId();
  const id = uuid();
  const passwordHash = bcrypt.hashSync(password, 10);

  try {
    await db.run(
      `INSERT INTO users (id, username, email, password_hash, display_name, avatar_color, avatar_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, username.toLowerCase(), email.toLowerCase(), passwordHash, displayName || username, avatarColor, chosenAvatarId]
    );

    const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    const token = signToken(id);

    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await db.get(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username.toLowerCase(), username.toLowerCase()]
    );

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user.id);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.patch('/me', authMiddleware, async (req, res, next) => {
  const { displayName, statusMessage, avatarId } = req.body;
  const updates = [];
  const values = [];

  if (displayName !== undefined) {
    updates.push('display_name = ?');
    values.push(displayName);
  }
  if (statusMessage !== undefined) {
    updates.push('status_message = ?');
    values.push(statusMessage);
  }
  if (avatarId !== undefined) {
    if (!isValidAvatarId(avatarId)) {
      return res.status(400).json({ error: 'Invalid avatar selection' });
    }
    updates.push('avatar_id = ?');
    values.push(avatarId);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  try {
    values.push(req.userId);
    await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.userId]);
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

export default router;
