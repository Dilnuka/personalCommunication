export function createPendingMessage({ conversationId, senderId, senderName, content }) {
  return {
    id: `pending-${crypto.randomUUID()}`,
    conversationId,
    senderId,
    senderName,
    content,
    createdAt: new Date().toISOString(),
    isOwn: true,
    pending: true,
  };
}

export function upsertMessage(list, message) {
  const withoutPendingDupes = list.filter((m) => {
    if (!m.pending || m.id === message.id) return true;
    if (m.senderId !== message.senderId) return true;
    return m.content !== message.content;
  });

  if (withoutPendingDupes.some((m) => m.id === message.id)) {
    return withoutPendingDupes.map((m) => (m.id === message.id ? { ...m, ...message, pending: false } : m));
  }

  return [...withoutPendingDupes, message];
}
