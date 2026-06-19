import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import Avatar from './Avatar';

function formatMessageTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateDivider(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function ChatWindow({ conversation, currentUserId, onStartCall, callState }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUser, setTypingUser] = useState(null);
  const { socket } = useSocket();
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const participant = conversation?.participants?.[0];
  const canCall = participant?.status === 'online' && callState === 'idle';

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!conversation) return;

    setLoading(true);
    setMessages([]);

    api.getMessages(conversation.id)
      .then(({ messages: msgs }) => {
        setMessages(msgs);
        api.markAsRead(conversation.id).catch(() => {});
      })
      .finally(() => setLoading(false));
  }, [conversation?.id]);

  useEffect(() => {
    if (!loading) scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  useEffect(() => {
    if (!socket || !conversation) return;

    socket.emit('conversation:join', { conversationId: conversation.id });

    function onNewMessage({ message }) {
      if (message.conversationId !== conversation.id) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, { ...message, isOwn: message.senderId === currentUserId }];
      });
      if (message.senderId !== currentUserId) {
        api.markAsRead(conversation.id).catch(() => {});
      }
    }

    function onTypingStart({ conversationId, userId, displayName }) {
      if (conversationId === conversation.id && userId !== currentUserId) {
        setTypingUser(displayName);
      }
    }

    function onTypingStop({ conversationId, userId }) {
      if (conversationId === conversation.id && userId !== currentUserId) {
        setTypingUser(null);
      }
    }

    socket.on('message:new', onNewMessage);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);

    return () => {
      socket.emit('conversation:leave', { conversationId: conversation.id });
      socket.off('message:new', onNewMessage);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
    };
  }, [socket, conversation?.id, currentUserId]);

  function handleInputChange(e) {
    setInput(e.target.value);
    if (!socket || !conversation) return;

    socket.emit('typing:start', { conversationId: conversation.id });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId: conversation.id });
    }, 2000);
  }

  function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !socket || !conversation) return;

    socket.emit('message:send', { conversationId: conversation.id, content: text });
    socket.emit('typing:stop', { conversationId: conversation.id });
    setInput('');
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0f172a] text-center p-8">
        <div className="w-20 h-20 rounded-full bg-brand-500/10 flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Select a conversation</h2>
        <p className="text-slate-400 max-w-sm">
          Choose a chat from the sidebar or start a new conversation with one of your contacts.
        </p>
      </div>
    );
  }

  let lastDate = null;

  return (
    <div className="flex-1 flex flex-col bg-[#0f172a] min-w-0">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-[#1e293b]/50">
        <div className="flex items-center gap-3">
          <Avatar
            name={conversation.name}
            color={participant?.avatarColor}
            status={participant?.status}
          />
          <div>
            <h2 className="font-semibold text-white">{conversation.name}</h2>
            <p className="text-sm text-slate-400">
              {typingUser
                ? `${typingUser} is typing...`
                : participant?.status === 'online'
                  ? 'Online'
                  : 'Offline'}
            </p>
          </div>
        </div>
        {onStartCall && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onStartCall('audio')}
              disabled={!canCall}
              title={canCall ? 'Voice call' : 'User must be online'}
              className="p-2.5 rounded-xl text-slate-300 hover:bg-slate-700/50 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
            <button
              onClick={() => onStartCall('video')}
              disabled={!canCall}
              title={canCall ? 'Video call' : 'User must be online'}
              className="p-2.5 rounded-xl text-slate-300 hover:bg-slate-700/50 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400">No messages yet. Say hello!</p>
          </div>
        )}

        {messages.map((msg) => {
          const msgDate = new Date(msg.createdAt).toDateString();
          let showDivider = false;
          if (msgDate !== lastDate) {
            showDivider = true;
            lastDate = msgDate;
          }

          return (
            <div key={msg.id}>
              {showDivider && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-slate-700/50" />
                  <span className="text-xs text-slate-500 font-medium">
                    {formatDateDivider(msg.createdAt)}
                  </span>
                  <div className="flex-1 h-px bg-slate-700/50" />
                </div>
              )}
              <div className={`flex mb-2 ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                    msg.isOwn
                      ? 'bg-brand-500 text-white rounded-br-md'
                      : 'bg-[#1e293b] text-slate-100 rounded-bl-md'
                  }`}
                >
                  <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${msg.isOwn ? 'text-brand-200' : 'text-slate-500'}`}>
                    {formatMessageTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="px-6 py-4 border-t border-slate-700/50 bg-[#1e293b]/30">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-[#0f172a] border border-slate-600/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
