import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import contactRoutes from './routes/contacts.js';
import conversationRoutes from './routes/conversations.js';
import webrtcRoutes from './routes/webrtc.js';
import assistantRoutes from './routes/assistant.js';
import { setupSocket } from './socket.js';
import { getDbInfo, initDb } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const clientDist = path.join(__dirname, '../../client/dist');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({
  origin: isProduction ? CLIENT_URL : CLIENT_URL,
  credentials: true,
}));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  const dbInfo = getDbInfo();
  res.json({
    status: 'ok',
    environment: isProduction ? 'production' : 'development',
    database: {
      provider: dbInfo.provider,
      host: dbInfo.host,
      database: dbInfo.database,
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/webrtc', webrtcRoutes);
app.use('/api/assistant', assistantRoutes);

app.use((err, _req, res, _next) => {
  console.error('API error:', err);
  res.status(500).json({ error: err.message || 'Server error' });
});

if (isProduction) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

setupSocket(server, CLIENT_URL);

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

async function startServer() {
  await initDb();
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
