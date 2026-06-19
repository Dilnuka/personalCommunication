import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import authRoutes from './routes/auth.js';
import contactRoutes from './routes/contacts.js';
import conversationRoutes from './routes/conversations.js';
import { setupSocket } from './socket.js';
import './db.js';

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/conversations', conversationRoutes);

setupSocket(server, CLIENT_URL);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
