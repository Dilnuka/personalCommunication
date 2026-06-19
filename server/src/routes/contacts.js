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
    status: row.status,
    statusMessage: row.status_message,
  };
}

router.get('/search', authMiddleware, (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  if (!q || q.length < 2) {
    return res.json({ users: [] });
  }

  const users = db.prepare(
    `SELECT id, username, display_name, avatar_color, status, status_message
     FROM users
     WHERE id != ? AND (username LIKE ? OR display_name LIKE ? OR email LIKE ?)
     LIMIT 20`
  ).all(req.userId, `%${q}%`, `%${q}%`, `%${q}%`);

  res.json({ users: users.map(publicUser) });
});

router.get('/', authMiddleware, (req, res) => {
  const contacts = db.prepare(
    `SELECT u.id, u.username, u.display_name, u.avatar_color, u.status, u.status_message
     FROM contacts c
     JOIN users u ON u.id = c.contact_id
     WHERE c.user_id = ?
     ORDER BY u.display_name`
  ).all(req.userId);

  res.json({ contacts: contacts.map(publicUser) });
});

router.post('/', authMiddleware, (req, res) => {
  const { contactId } = req.body;
  if (!contactId) {
    return res.status(400).json({ error: 'contactId is required' });
  }
  if (contactId === req.userId) {
    return res.status(400).json({ error: 'Cannot add yourself as a contact' });
  }

  const contact = db.prepare('SELECT id FROM users WHERE id = ?').get(contactId);
  if (!contact) {
    return res.status(404).json({ error: 'User not found' });
  }

  const existing = db.prepare(
    'SELECT id FROM contacts WHERE user_id = ? AND contact_id = ?'
  ).get(req.userId, contactId);

  if (existing) {
    return res.status(409).json({ error: 'Contact already added' });
  }

  db.prepare('INSERT INTO contacts (id, user_id, contact_id) VALUES (?, ?, ?)')
    .run(uuid(), req.userId, contactId);

  const user = db.prepare(
    'SELECT id, username, display_name, avatar_color, status, status_message FROM users WHERE id = ?'
  ).get(contactId);

  res.status(201).json({ contact: publicUser(user) });
});

router.delete('/:contactId', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM contacts WHERE user_id = ? AND contact_id = ?')
    .run(req.userId, req.params.contactId);
  res.json({ success: true });
});

export default router;
