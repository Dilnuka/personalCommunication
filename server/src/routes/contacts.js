import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { authMiddleware } from '../auth.js';

const router = Router();

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarColor: row.avatar_color,
    avatarId: row.avatar_id || null,
    status: row.status,
    statusMessage: row.status_message,
  };
}

router.get('/search', authMiddleware, async (req, res, next) => {
  const q = (req.query.q || '').trim().toLowerCase();
  if (!q || q.length < 2) {
    return res.json({ users: [] });
  }

  try {
    const users = await db.all(
      `SELECT id, username, display_name, avatar_color, avatar_id, status, status_message
       FROM users
       WHERE id != ? AND (username ILIKE ? OR display_name ILIKE ? OR email ILIKE ?)
       LIMIT 20`,
      [req.userId, `%${q}%`, `%${q}%`, `%${q}%`]
    );

    res.json({ users: users.map(publicUser) });
  } catch (err) {
    next(err);
  }
});

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const contacts = await db.all(
      `SELECT u.id, u.username, u.display_name, u.avatar_color, u.avatar_id, u.status, u.status_message
       FROM contacts c
       JOIN users u ON u.id = c.contact_id
       WHERE c.user_id = ?
       ORDER BY u.display_name`,
      [req.userId]
    );

    res.json({ contacts: contacts.map(publicUser) });
  } catch (err) {
    next(err);
  }
});

router.post('/', authMiddleware, async (req, res, next) => {
  const { contactId } = req.body;
  if (!contactId) {
    return res.status(400).json({ error: 'contactId is required' });
  }
  if (contactId === req.userId) {
    return res.status(400).json({ error: 'Cannot add yourself as a contact' });
  }

  try {
    const contact = await db.get('SELECT id FROM users WHERE id = ?', [contactId]);
    if (!contact) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existing = await db.get(
      'SELECT id FROM contacts WHERE user_id = ? AND contact_id = ?',
      [req.userId, contactId]
    );

    if (existing) {
      return res.status(409).json({ error: 'Contact already added' });
    }

    await db.run('INSERT INTO contacts (id, user_id, contact_id) VALUES (?, ?, ?)', [
      uuid(),
      req.userId,
      contactId,
    ]);

    const user = await db.get(
      'SELECT id, username, display_name, avatar_color, avatar_id, status, status_message FROM users WHERE id = ?',
      [contactId]
    );

    res.status(201).json({ contact: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.delete('/:contactId', authMiddleware, async (req, res, next) => {
  try {
    await db.run('DELETE FROM contacts WHERE user_id = ? AND contact_id = ?', [
      req.userId,
      req.params.contactId,
    ]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
