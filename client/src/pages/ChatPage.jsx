import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { api } from '../services/api';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import AddContactModal from '../components/AddContactModal';
import CallOverlay from '../components/CallOverlay';
import ConnectionBanner from '../components/ConnectionBanner';
import ProfileModal from '../components/ProfileModal';
import DooraAssistant from '../components/DooraAssistant';
import { useWebRTC } from '../hooks/useWebRTC';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';

export default function ChatPage() {
  const { user, logout, updateProfile } = useAuth();
  const { socket, connected } = useSocket();
  const { showToast } = useToast();
  const { notifyNewMessage } = useNotifications();
  const navigate = useNavigate();

  const webrtc = useWebRTC(socket, user?.id);

  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const showMobileChat = Boolean(activeConversation && mobileChatOpen);
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const activeConversationIdRef = useRef(activeConversation?.id);
  activeConversationIdRef.current = activeConversation?.id;

  function shouldNotifyForMessage(conversationId, senderId) {
    if (senderId === user?.id) return false;
    if (document.visibilityState === 'hidden') return true;
    if (activeConversationIdRef.current !== conversationId) return true;
    if (!mobileChatOpen && window.innerWidth < 768) return true;
    return false;
  }

  const lastNotifiedRef = useRef({ id: null, at: 0 });

  function maybeNotifyMessage({ id, conversationId, senderId, senderName, content }) {
    if (!shouldNotifyForMessage(conversationId, senderId)) return;
    const now = Date.now();
    if (lastNotifiedRef.current.id === id && now - lastNotifiedRef.current.at < 3000) return;
    lastNotifiedRef.current = { id, at: now };
    notifyNewMessage({
      senderName: senderName || 'New message',
      content,
      onFocus: () => loadData(),
    });
  }

  const loadData = useCallback(async () => {
    try {
      const [convRes, contactRes] = await Promise.all([
        api.getConversations(),
        api.getContacts(),
      ]);
      setConversations(convRes.conversations);
      setContacts(contactRes.contacts);
    } catch (err) {
      showToast(err.message || 'Failed to load data', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) Connect` : 'Connect';
    return () => { document.title = 'Connect'; };
  }, [totalUnread]);

  useEffect(() => {
    if (!socket) return;

    function onConversationUpdated({ conversationId, lastMessage }) {
      if (lastMessage) {
        maybeNotifyMessage({
          id: lastMessage.id,
          conversationId,
          senderId: lastMessage.senderId,
          senderName: lastMessage.senderName,
          content: lastMessage.content,
        });
      }

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
      maybeNotifyMessage(message);

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
    setMobileChatOpen(true);
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
      setMobileChatOpen(true);
    } catch (err) {
      showToast(err.message || 'Could not open chat', 'error');
    }
  }

  async function handleSaveProfile(data) {
    await updateProfile(data);
    showToast('Profile updated', 'success');
  }

  function handleContactAdded(contact) {
    setContacts((prev) => {
      if (prev.some((c) => c.id === contact.id)) return prev;
      return [...prev, contact];
    });
    setShowAddContact(false);
    showToast(`${contact.displayName} added to contacts`, 'success');
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function handleStartCall(callType) {
    const participant = activeConversation?.participants?.[0];
    if (!participant || !activeConversation) return;
    webrtc.startCall(
      activeConversation.id,
      participant.id,
      participant.displayName,
      callType
    );
  }

  return (
    <>
      <div className="h-[100dvh] flex flex-col overflow-hidden">
        <ConnectionBanner connected={connected} />
        <div className="flex flex-1 min-h-0 overflow-hidden">
        <div
          className={`${
            showMobileChat ? 'max-md:hidden' : 'max-md:flex'
          } md:flex w-full md:w-80 lg:w-96 shrink-0`}
        >
          <Sidebar
            user={user}
            conversations={conversations}
            contacts={contacts}
            activeConversationId={activeConversation?.id}
            onSelectConversation={handleSelectConversation}
            onStartChat={handleStartChat}
            onLogout={handleLogout}
            onAddContact={() => setShowAddContact(true)}
            onOpenProfile={() => setShowProfile(true)}
            connected={connected}
            totalUnread={totalUnread}
          />
        </div>

        <div
          className={`${
            showMobileChat || !activeConversation ? 'flex' : 'max-md:hidden'
          } md:flex flex-1 min-w-0`}
        >
          <ChatWindow
            conversation={activeConversation}
            currentUserId={user.id}
            onStartCall={handleStartCall}
            callState={webrtc.callState}
            onBack={() => setMobileChatOpen(false)}
            showBackButton={showMobileChat}
          />
        </div>

        {showAddContact && (
          <AddContactModal
            onClose={() => setShowAddContact(false)}
            onContactAdded={handleContactAdded}
          />
        )}
        </div>
      </div>

      {showProfile && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onSave={handleSaveProfile}
        />
      )}

      <CallOverlay
        callState={webrtc.callState}
        incomingCall={webrtc.incomingCall}
        activeCall={webrtc.activeCall}
        isMuted={webrtc.isMuted}
        isVideoOff={webrtc.isVideoOff}
        localVideoRef={webrtc.localVideoRef}
        remoteVideoRef={webrtc.remoteVideoRef}
        onAccept={webrtc.acceptCall}
        onReject={webrtc.rejectCall}
        onEnd={webrtc.endCall}
        onToggleMute={webrtc.toggleMute}
        onToggleVideo={webrtc.toggleVideo}
      />

      <DooraAssistant />
    </>
  );
}
