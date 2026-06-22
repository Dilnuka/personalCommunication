import { Server } from 'socket.io';
import { v4 as uuid } from 'uuid';
import db from './db.js';
import { socketAuth } from './auth.js';

const onlineUsers = new Map();

export function setupSocket(server, corsOrigin) {
  const io = new Server(server, {
    cors: { origin: corsOrigin, credentials: true },
  });

  io.use(socketAuth);

  io.on('connection', (socket) => {
    (async () => {
      const userId = socket.userId;

      const user = await db.get(
        'SELECT id, username, display_name, avatar_color, avatar_id, status, status_message FROM users WHERE id = ?',
        [userId]
      );

      if (!user) {
        console.warn(`Socket rejected: user ${userId} not found in database`);
        socket.disconnect(true);
        return;
      }

      onlineUsers.set(userId, socket.id);

      await db.run("UPDATE users SET status = 'online' WHERE id = ?", [userId]);

      io.emit('user:status', {
        userId,
        status: 'online',
        user: {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          avatarColor: user.avatar_color,
          avatarId: user.avatar_id || null,
          status: 'online',
          statusMessage: user.status_message,
        },
      });

      socket.on('conversation:join', async ({ conversationId }) => {
        const member = await db.get(
          'SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?',
          [conversationId, userId]
        );

        if (member) {
          socket.join(`conv:${conversationId}`);
        }
      });

      socket.on('conversation:leave', ({ conversationId }) => {
        socket.leave(`conv:${conversationId}`);
      });

      socket.on('message:send', async ({ conversationId, content }) => {
        if (!content?.trim()) return;

        const member = await db.get(
          'SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?',
          [conversationId, userId]
        );

        if (!member) return;

        const messageId = uuid();
        const now = new Date().toISOString();

        await db.run(
          'INSERT INTO messages (id, conversation_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)',
          [messageId, conversationId, userId, content.trim(), now]
        );

        const sender = await db.get(
          'SELECT display_name, avatar_color, avatar_id FROM users WHERE id = ?',
          [userId]
        );

        if (!sender) return;

        const message = {
          id: messageId,
          conversationId,
          senderId: userId,
          senderName: sender.display_name,
          senderAvatarColor: sender.avatar_color,
          senderAvatarId: sender.avatar_id || null,
          content: content.trim(),
          createdAt: now,
        };

        io.to(`conv:${conversationId}`).emit('message:new', { message });

        const members = await db.all(
          'SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ?',
          [conversationId, userId]
        );

        for (const m of members) {
          const socketId = onlineUsers.get(m.user_id);
          if (socketId) {
            io.to(socketId).emit('conversation:updated', {
              conversationId,
              lastMessage: {
                id: messageId,
                content: message.content,
                senderId: userId,
                senderName: sender.display_name,
                createdAt: now,
              },
            });
          }
        }
      });

      socket.on('typing:start', ({ conversationId }) => {
        socket.to(`conv:${conversationId}`).emit('typing:start', {
          conversationId,
          userId,
          displayName: user.display_name,
        });
      });

      socket.on('typing:stop', ({ conversationId }) => {
        socket.to(`conv:${conversationId}`).emit('typing:stop', {
          conversationId,
          userId,
        });
      });

      function relayToUser(targetUserId, event, payload) {
        const socketId = onlineUsers.get(targetUserId);
        if (socketId) {
          io.to(socketId).emit(event, payload);
        }
      }

      socket.on('call:invite', ({ conversationId, targetUserId, callType, callId }) => {
        relayToUser(targetUserId, 'call:incoming', {
          callId,
          conversationId,
          callType,
          fromUserId: userId,
          fromName: user.display_name,
        });
      });

      socket.on('call:accept', ({ callId, targetUserId }) => {
        relayToUser(targetUserId, 'call:accepted', { callId, fromUserId: userId });
      });

      socket.on('call:reject', ({ callId, targetUserId }) => {
        relayToUser(targetUserId, 'call:rejected', { callId, fromUserId: userId });
      });

      socket.on('call:end', ({ callId, targetUserId }) => {
        relayToUser(targetUserId, 'call:ended', { callId, fromUserId: userId });
      });

      socket.on('call:offer', ({ callId, targetUserId, offer }) => {
        relayToUser(targetUserId, 'call:offer', { callId, fromUserId: userId, offer });
      });

      socket.on('call:answer', ({ callId, targetUserId, answer }) => {
        relayToUser(targetUserId, 'call:answer', { callId, fromUserId: userId, answer });
      });

      socket.on('call:ice-candidate', ({ callId, targetUserId, candidate }) => {
        relayToUser(targetUserId, 'call:ice-candidate', { callId, fromUserId: userId, candidate });
      });

      socket.on('disconnect', async () => {
        if (onlineUsers.get(userId) === socket.id) {
          onlineUsers.delete(userId);
          await db.run("UPDATE users SET status = 'offline' WHERE id = ?", [userId]);
          io.emit('user:status', { userId, status: 'offline' });
        }
      });
    })().catch((err) => {
      console.error('Socket connection setup failed:', err);
      socket.disconnect(true);
    });
  });

  return io;
}

export function getOnlineUsers() {
  return onlineUsers;
}
