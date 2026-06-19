import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { api } from '../services/api';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import AddContactModal from '../components/AddContactModal';

export default function ChatPage() {
  const { user, logout } = useAuth();
  const { socket, connected } = useSocket();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [showAddContact, setShowAddContact] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [convRes, contactRes] = await Promise.all([
        api.getConversations(),
        api.getContacts(),
      ]);
      setConversations(convRes.conversations);
      setContacts(contactRes.contacts);
    } catch {
      // silently fail on refresh
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!socket) return;

    function onConversationUpdated({ conversationId, lastMessage }) {
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                lastMessage,
                unreadCount:
                  activeConversation?.id === conversationId
                    ? c.unreadCount
                    : c.unreadCount + 1,
              }
            : c
        );

        const exists = updated.some((c) => c.id === conversationId);
        if (!exists) {
          loadData();
          return prev;
        }

        return updated.sort((a, b) => {
          const aTime = a.lastMessage?.createdAt || a.createdAt;
          const bTime = b.lastMessage?.createdAt || b.createdAt;
          return bTime.localeCompare(aTime);
        });
      });
    }

    function onUserStatus({ userId, status, user: updatedUser }) {
      setContacts((prev) =>
        prev.map((c) => (c.id === userId ? { ...c, status } : c))
      );
      setConversations((prev) =>
        prev.map((conv) => ({
          ...conv,
          participants: conv.participants.map((p) =>
            p.id === userId ? { ...p, status, ...(updatedUser || {}) } : p
          ),
        }))
      );
      setActiveConversation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map((p) =>
            p.id === userId ? { ...p, status } : p
          ),
        };
      });
    }

    function onNewMessage({ message }) {
      if (activeConversation?.id === message.conversationId) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === message.conversationId
              ? {
                  ...c,
                  lastMessage: {
                    id: message.id,
                    content: message.content,
                    senderId: message.senderId,
                    senderName: message.senderName,
                    createdAt: message.createdAt,
                  },
                }
              : c
          )
        );
      }
    }

    socket.on('conversation:updated', onConversationUpdated);
    socket.on('user:status', onUserStatus);
    socket.on('message:new', onNewMessage);

    return () => {
      socket.off('conversation:updated', onConversationUpdated);
      socket.off('user:status', onUserStatus);
      socket.off('message:new', onNewMessage);
    };
  }, [socket, activeConversation?.id, loadData]);

  function handleSelectConversation(conv) {
    setActiveConversation(conv);
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
    );
  }

  async function handleStartChat(contact) {
    try {
      const { conversation } = await api.createDirectConversation(contact.id);
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === conversation.id);
        if (exists) return prev;
        return [conversation, ...prev];
      });
      setActiveConversation(conversation);
    } catch {
      // handle error silently
    }
  }

  function handleContactAdded(contact) {
    setContacts((prev) => {
      if (prev.some((c) => c.id === contact.id)) return prev;
      return [...prev, contact];
    });
    setShowAddContact(false);
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar
        user={user}
        conversations={conversations}
        contacts={contacts}
        activeConversationId={activeConversation?.id}
        onSelectConversation={handleSelectConversation}
        onStartChat={handleStartChat}
        onLogout={handleLogout}
        onAddContact={() => setShowAddContact(true)}
        connected={connected}
      />
      <ChatWindow conversation={activeConversation} currentUserId={user.id} />

      {showAddContact && (
        <AddContactModal
          onClose={() => setShowAddContact(false)}
          onContactAdded={handleContactAdded}
        />
      )}
    </div>
  );
}
