const DB_NAME = 'connect-message-cache';
const DB_VERSION = 1;
const MESSAGES_STORE = 'messages';
const OUTBOX_STORE = 'outbox';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
        const store = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
        store.createIndex('conversationId', 'conversationId', { unique: false });
        store.createIndex('conversationCreatedAt', ['conversationId', 'createdAt'], { unique: false });
      }
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        db.createObjectStore(OUTBOX_STORE, { keyPath: 'id' });
      }
    };
  });
}

function runTransaction(storeName, mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const result = fn(store);
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
      })
  );
}

export async function getCachedMessages(conversationId) {
  if (!conversationId) return [];
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MESSAGES_STORE, 'readonly');
    const store = tx.objectStore(MESSAGES_STORE);
    const index = store.index('conversationId');
    const request = index.getAll(conversationId);
    request.onsuccess = () => {
      const rows = request.result || [];
      rows.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      resolve(rows);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function putCachedMessage(message) {
  if (!message?.id || !message?.conversationId) return;
  await runTransaction(MESSAGES_STORE, 'readwrite', (store) => {
    store.put(message);
  });
}

export async function putCachedMessages(messages) {
  if (!messages?.length) return;
  await runTransaction(MESSAGES_STORE, 'readwrite', (store) => {
    for (const message of messages) {
      if (message?.id && message?.conversationId) {
        store.put(message);
      }
    }
  });
}

export async function getOutbox() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, 'readonly');
    const request = tx.objectStore(OUTBOX_STORE).getAll();
    request.onsuccess = () => {
      const rows = request.result || [];
      rows.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      resolve(rows);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function addToOutbox(item) {
  await runTransaction(OUTBOX_STORE, 'readwrite', (store) => {
    store.put(item);
  });
}

export async function removeFromOutbox(id) {
  await runTransaction(OUTBOX_STORE, 'readwrite', (store) => {
    store.delete(id);
  });
}

export function mergeMessages(serverMessages, localMessages) {
  const map = new Map();
  for (const msg of [...serverMessages, ...localMessages]) {
    const existing = map.get(msg.id);
    if (!existing) {
      map.set(msg.id, msg);
      continue;
    }
    if (existing.pending && !msg.pending) {
      map.set(msg.id, msg);
    }
  }
  return [...map.values()].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}
