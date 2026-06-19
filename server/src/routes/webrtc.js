import { Router } from 'express';
import { authMiddleware } from '../auth.js';

const router = Router();

const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.relay.metered.ca:80' },
];

router.get('/ice-servers', authMiddleware, async (_req, res) => {
  const apiKey = process.env.METERED_API_KEY;
  const domain = process.env.METERED_DOMAIN || 'openrelay.metered.ca';

  if (!apiKey) {
    return res.json({ iceServers: DEFAULT_ICE_SERVERS });
  }

  try {
    const url = `https://${domain}/api/v1/turn/credentials?apiKey=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Metered API error: ${response.status}`);
    }

    const iceServers = await response.json();
    res.json({ iceServers });
  } catch (err) {
    console.error('Failed to fetch TURN credentials:', err.message);
    res.json({ iceServers: DEFAULT_ICE_SERVERS });
  }
});

export default router;
