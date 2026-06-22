import db from '../db.js';

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning';
const FALLBACK_MODELS = [
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
  'nvidia/nemotron-mini-4b-instruct',
  'meta/llama-3.1-8b-instruct',
];

const SYSTEM_PROMPT = `You are Doora, the smart AI assistant inside the Connect personal communication app.

Your role:
- Help users with general knowledge questions
- Help users understand and use the Connect platform (chat, calls, contacts, profile, notifications)
- Help users find and learn about people on the platform when platform context is provided

Rules:
- Be friendly, concise, and helpful
- When platform user data is provided below, use it to answer questions about contacts, who is online, and who exists on the platform
- Never invent users that are not in the provided platform context
- Never share passwords, emails, or private account details of other users
- If platform data is missing for a question, say you do not have that information and suggest searching contacts in the app
- You can answer general knowledge questions outside the platform too
- Keep responses readable with short paragraphs or bullet points when helpful`;

function publicUserSummary(row) {
  if (!row) return null;
  return {
    displayName: row.display_name,
    username: row.username,
    status: row.status,
    statusMessage: row.status_message || '',
  };
}

function wantsUserContext(message) {
  return /\b(user|users|contact|contacts|people|person|who|online|offline|find|search|member|friend|colleague|team)\b/i.test(
    message
  );
}

function extractSearchTerms(message) {
  const cleaned = message
    .replace(/[^\w\s@]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 2)
    .filter((word) => !/^(who|what|where|when|how|the|and|are|is|my|me|on|in|at|to|a|an)$/i.test(word));

  return cleaned.slice(0, 5);
}

async function searchPlatformUsers(requestingUserId, message) {
  const terms = extractSearchTerms(message);
  if (terms.length === 0) return [];

  const patterns = terms.map((t) => `%${t.toLowerCase()}%`);
  const conditions = patterns
    .map(() => '(LOWER(username) LIKE ? OR LOWER(display_name) LIKE ?)')
    .join(' OR ');
  const params = patterns.flatMap((p) => [p, p]);

  const rows = await db.all(
    `SELECT username, display_name, status, status_message
     FROM users
     WHERE id != ? AND (${conditions})
     ORDER BY display_name
     LIMIT 15`,
    [requestingUserId, ...params]
  );

  return rows.map(publicUserSummary);
}

export async function buildPlatformContext(userId, message) {
  const me = await db.get(
    'SELECT username, display_name, email, status, status_message FROM users WHERE id = ?',
    [userId]
  );

  const contacts = await db.all(
    `SELECT u.username, u.display_name, u.status, u.status_message
     FROM contacts c
     JOIN users u ON u.id = c.contact_id
     WHERE c.user_id = ?
     ORDER BY u.display_name
     LIMIT 50`,
    [userId]
  );

  const onlineContacts = contacts.filter((c) => c.status === 'online').length;
  let directoryMatches = [];

  if (wantsUserContext(message)) {
    directoryMatches = await searchPlatformUsers(userId, message);
  }

  const lines = [
    '=== PLATFORM CONTEXT (Connect app) ===',
    `Current user: ${me.display_name} (@${me.username}), status: ${me.status}`,
    me.status_message ? `Current user status message: "${me.status_message}"` : null,
    `Contacts: ${contacts.length} total, ${onlineContacts} online`,
  ].filter(Boolean);

  if (contacts.length > 0) {
    lines.push('Contact list:');
    for (const c of contacts) {
      lines.push(
        `- ${c.display_name} (@${c.username}) — ${c.status}${c.status_message ? `, "${c.status_message}"` : ''}`
      );
    }
  } else {
    lines.push('Contact list: (empty — user has not added contacts yet)');
  }

  if (directoryMatches.length > 0) {
    lines.push('Directory search matches (other users on platform):');
    for (const u of directoryMatches) {
      lines.push(
        `- ${u.displayName} (@${u.username}) — ${u.status}${u.statusMessage ? `, "${u.statusMessage}"` : ''}`
      );
    }
  }

  lines.push('=== END PLATFORM CONTEXT ===');
  return lines.join('\n');
}

export async function chatWithDoora({ userId, messages }) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error('Doora is not configured. NVIDIA_API_KEY is missing on the server.');
  }

  const configuredModel = process.env.NVIDIA_MODEL || DEFAULT_MODEL;
  const modelsToTry = [...new Set([configuredModel, ...FALLBACK_MODELS])];
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  const platformContext = await buildPlatformContext(userId, lastUserMessage);

  const baseMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: platformContext },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  let lastError = 'NVIDIA API request failed';

  for (const model of modelsToTry) {
    const payload = {
      model,
      messages: baseMessages,
      temperature: 0.4,
      top_p: 0.7,
      max_tokens: 1024,
      stream: false,
    };

    const res = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 404) {
      lastError = `Model not found: ${model}`;
      continue;
    }

    if (!res.ok) {
      const detail = data?.error?.message || data?.detail || `NVIDIA API error (${res.status})`;
      throw new Error(detail);
    }

    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      throw new Error('Doora returned an empty response. Try again.');
    }

    return { reply, model };
  }

  throw new Error(
    `${lastError}. Update NVIDIA_MODEL to nvidia/nemotron-3-nano-omni-30b-a3b-reasoning in Railway variables.`
  );
}
