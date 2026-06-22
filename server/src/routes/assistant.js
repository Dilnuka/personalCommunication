import { Router } from 'express';
import { authMiddleware } from '../auth.js';
import { chatWithDoora } from '../services/doora.js';

const router = Router();

router.post('/chat', authMiddleware, async (req, res, next) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    if (messages.length > 30) {
      return res.status(400).json({ error: 'Too many messages in this conversation' });
    }

    const sanitized = messages
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({
        role: m.role,
        content: m.content.trim().slice(0, 4000),
      }))
      .filter((m) => m.content.length > 0);

    if (sanitized.length === 0 || sanitized[sanitized.length - 1].role !== 'user') {
      return res.status(400).json({ error: 'Last message must be from the user' });
    }

    const { reply, model } = await chatWithDoora({
      userId: req.userId,
      messages: sanitized,
    });

    res.json({ reply, model });
  } catch (err) {
    next(err);
  }
});

export default router;
