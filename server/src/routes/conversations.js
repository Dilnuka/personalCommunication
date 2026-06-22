import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db, { runTransaction } from '../db.js';
import { authMiddleware } from '../auth.js';

const router = Router();

async function getOrCreateDirectConversation(userId, otherUserId) {
  const existing = await db.get(
    `SELECT c.id FROM conversations c
     JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = ?
     JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = ?
     WHERE c.type = 'direct'
     LIMIT 1`,
    [userId, otherUserId]
  );

  if (existing) return existing.id;

  const conversationId = uuid();

  await runTransaction(async (tx) => {
    await tx.run('INSERT INTO conversations (id, type) VALUES (?, ?)', [conversationId, 'direct']);
    await tx.run('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)', [conversationId, userId]);
    await tx.run('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)', [conversationId, otherUserId]);
  });

  return conversationId;
}

function getConversationParticipants(conversationId, excludeUserId) {
  return db.all(
    `SELECT u.id, u.username, u.display_name, u.avatar_color, u.status, u.status_message
     FROM conversation_members cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.conversation_id = ? AND u.id != ?`,
    [conversationId, excludeUserId]
  );
}

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const conversations = await db.all(
      `SELECT c.id, c.type, c.name, c.created_at
       FROM conversations c
       JOIN conversation_members cm ON cm.conversation_id = c.id
       WHERE cm.user_id = ?
       ORDER BY c.created_at DESC`,
      [req.userId]
    );

    const result = await Promise.all(conversations.map(async (conv) => {
      const participants = await getConversationParticipants(conv.id, req.userId);
      const lastMessage = await db.get(
        `SELECT m.id, m.content, m.sender_id, m.created_at, u.display_name as sender_name
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.conversation_id = ?
         ORDER BY m.created_at DESC
         LIMIT 1`,
        [conv.id]
      );

      const unreadCount = await db.get(
        `SELECT COUNT(*)::int as count FROM messages m
         WHERE m.conversation_id = ?
         AND m.sender_id != ?
         AND NOT EXISTS (
           SELECT 1 FROM message_reads mr
           WHERE mr.message_id = m.id AND mr.user_id = ?
         )`,
        [conv.id, req.userId, req.userId]
      );

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
    }));

    result.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || a.createdAt;
      const bTime = b.lastMessage?.createdAt || b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    res.json({ conversations: result });
  } catch (err) {
    next(err);
  }
});

router.post('/direct', authMiddleware, async (req, res) => {
  try {
    const { userId: otherUserId } = req.body;
    if (!otherUserId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const other = await db.get('SELECT id FROM users WHERE id = ?', [otherUserId]);
    if (!other) {
      return res.status(404).json({ error: 'User not found' });
    }

    const conversationId = await getOrCreateDirectConversation(req.userId, otherUserId);
    const participants = await getConversationParticipants(conversationId, req.userId);

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

router.get('/:id/messages', authMiddleware, async (req, res, next) => {
  try {
    const member = await db.get(
      'SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!member) {
      return res.status(403).json({ error: 'Not a member of this conversation' });
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const before = req.query.before;

    let messages;
    if (before) {
      messages = await db.all(
        `SELECT m.id, m.conversation_id, m.sender_id, m.content, m.created_at,
                u.display_name as sender_name, u.avatar_color as sender_avatar_color
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.conversation_id = ? AND m.created_at < ?
         ORDER BY m.created_at DESC
         LIMIT ?`,
        [req.params.id, before, limit]
      );
    } else {
      messages = await db.all(
        `SELECT m.id, m.conversation_id, m.sender_id, m.content, m.created_at,
                u.display_name as sender_name, u.avatar_color as sender_avatar_color
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.conversation_id = ?
         ORDER BY m.created_at DESC
         LIMIT ?`,
        [req.params.id, limit]
      );
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
  } catch (err) {
    next(err);
  }
});

router.post('/:id/read', authMiddleware, async (req, res, next) => {
  try {
    const member = await db.get(
      'SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!member) {
      return res.status(403).json({ error: 'Not a member of this conversation' });
    }

    const unreadMessages = await db.all(
      `SELECT m.id FROM messages m
       WHERE m.conversation_id = ?
       AND m.sender_id != ?
       AND NOT EXISTS (
         SELECT 1 FROM message_reads mr
         WHERE mr.message_id = m.id AND mr.user_id = ?
       )`,
      [req.params.id, req.userId, req.userId]
    );

    await runTransaction(async (tx) => {
      for (const msg of unreadMessages) {
        await tx.query(
          'INSERT INTO message_reads (message_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [msg.id, req.userId]
        );
      }
    });

    res.json({ success: true, readCount: unreadMessages.length });
  } catch (err) {
    next(err);
  }
});

export { getOrCreateDirectConversation };
export default router;
