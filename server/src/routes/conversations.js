import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db, { runTransaction } from '../db.js';
import { authMiddleware } from '../auth.js';

const router = Router();

function getOrCreateDirectConversation(userId, otherUserId) {
  const existing = db.prepare(
    `SELECT c.id FROM conversations c
     JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = ?
     JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = ?
     WHERE c.type = 'direct'
     LIMIT 1`
  ).get(userId, otherUserId);

  if (existing) return existing.id;

  const conversationId = uuid();
  const insertConv = db.prepare(
    'INSERT INTO conversations (id, type) VALUES (?, ?)'
  );
  const insertMember = db.prepare(
    'INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)'
  );

  runTransaction(() => {
    insertConv.run(conversationId, 'direct');
    insertMember.run(conversationId, userId);
    insertMember.run(conversationId, otherUserId);
  });

  return conversationId;
}

function getConversationParticipants(conversationId, excludeUserId) {
  return db.prepare(
    `SELECT u.id, u.username, u.display_name, u.avatar_color, u.status, u.status_message
     FROM conversation_members cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.conversation_id = ? AND u.id != ?`
  ).all(conversationId, excludeUserId);
}

router.get('/', authMiddleware, (req, res) => {
  const conversations = db.prepare(
    `SELECT c.id, c.type, c.name, c.created_at
     FROM conversations c
     JOIN conversation_members cm ON cm.conversation_id = c.id
     WHERE cm.user_id = ?
     ORDER BY c.created_at DESC`
  ).all(req.userId);

  const result = conversations.map((conv) => {
    const participants = getConversationParticipants(conv.id, req.userId);
    const lastMessage = db.prepare(
      `SELECT m.id, m.content, m.sender_id, m.created_at, u.display_name as sender_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at DESC
       LIMIT 1`
    ).get(conv.id);

    const unreadCount = db.prepare(
      `SELECT COUNT(*) as count FROM messages m
       WHERE m.conversation_id = ?
       AND m.sender_id != ?
       AND NOT EXISTS (
         SELECT 1 FROM message_reads mr
         WHERE mr.message_id = m.id AND mr.user_id = ?
       )`
    ).get(conv.id, req.userId, req.userId);

    return {
      id: conv.id,
      type: conv.type,
      name: conv.name || participants[0]?.display_name || 'Chat',
      participants: participants.map((p) => ({
        id: p.id,
        username: p.username,
        displayName: p.display_name,
        avatarColor: p.avatar_color,
        status: p.status,
        statusMessage: p.status_message,
      })),
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            content: lastMessage.content,
            senderId: lastMessage.sender_id,
            senderName: lastMessage.sender_name,
            createdAt: lastMessage.created_at,
          }
        : null,
      unreadCount: unreadCount?.count || 0,
      createdAt: conv.created_at,
    };
  });

  result.sort((a, b) => {
    const aTime = a.lastMessage?.createdAt || a.createdAt;
    const bTime = b.lastMessage?.createdAt || b.createdAt;
    return bTime.localeCompare(aTime);
  });

  res.json({ conversations: result });
});

router.post('/direct', authMiddleware, (req, res) => {
  try {
    const { userId: otherUserId } = req.body;
    if (!otherUserId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const other = db.prepare('SELECT id FROM users WHERE id = ?').get(otherUserId);
    if (!other) {
      return res.status(404).json({ error: 'User not found' });
    }

    const conversationId = getOrCreateDirectConversation(req.userId, otherUserId);
    const participants = getConversationParticipants(conversationId, req.userId);

    res.json({
      conversation: {
        id: conversationId,
        type: 'direct',
        name: participants[0]?.display_name || 'Chat',
        participants: participants.map((p) => ({
          id: p.id,
          username: p.username,
          displayName: p.display_name,
          avatarColor: p.avatar_color,
          status: p.status,
          statusMessage: p.status_message,
        })),
        lastMessage: null,
        unreadCount: 0,
      },
    });
  } catch (err) {
    console.error('POST /conversations/direct error:', err);
    res.status(500).json({ error: 'Failed to start conversation' });
  }
});

router.get('/:id/messages', authMiddleware, (req, res) => {
  const member = db.prepare(
    'SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);

  if (!member) {
    return res.status(403).json({ error: 'Not a member of this conversation' });
  }

  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const before = req.query.before;

  let messages;
  if (before) {
    messages = db.prepare(
      `SELECT m.id, m.conversation_id, m.sender_id, m.content, m.created_at,
              u.display_name as sender_name, u.avatar_color as sender_avatar_color
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = ? AND m.created_at < ?
       ORDER BY m.created_at DESC
       LIMIT ?`
    ).all(req.params.id, before, limit);
  } else {
    messages = db.prepare(
      `SELECT m.id, m.conversation_id, m.sender_id, m.content, m.created_at,
              u.display_name as sender_name, u.avatar_color as sender_avatar_color
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at DESC
       LIMIT ?`
    ).all(req.params.id, limit);
  }

  const formatted = messages.reverse().map((m) => ({
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    senderName: m.sender_name,
    senderAvatarColor: m.sender_avatar_color,
    content: m.content,
    createdAt: m.created_at,
    isOwn: m.sender_id === req.userId,
  }));

  res.json({ messages: formatted });
});

router.post('/:id/read', authMiddleware, (req, res) => {
  const member = db.prepare(
    'SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);

  if (!member) {
    return res.status(403).json({ error: 'Not a member of this conversation' });
  }

  const unreadMessages = db.prepare(
    `SELECT m.id FROM messages m
     WHERE m.conversation_id = ?
     AND m.sender_id != ?
     AND NOT EXISTS (
       SELECT 1 FROM message_reads mr
       WHERE mr.message_id = m.id AND mr.user_id = ?
     )`
  ).all(req.params.id, req.userId, req.userId);

  const insertRead = db.prepare(
    'INSERT OR IGNORE INTO message_reads (message_id, user_id) VALUES (?, ?)'
  );

  runTransaction(() => {
    for (const msg of unreadMessages) {
      insertRead.run(msg.id, req.userId);
    }
  });

  res.json({ success: true, readCount: unreadMessages.length });
});

export { getOrCreateDirectConversation };
export default router;
