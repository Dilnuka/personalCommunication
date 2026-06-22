import { useState } from 'react';
import Avatar from './Avatar';
import { DooraLauncher } from './DooraAssistant';

function formatTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 604800000) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function Sidebar({
  user,
  conversations,
  contacts,
  activeConversationId,
  onSelectConversation,
  onStartChat,
  onLogout,
  onAddContact,
  onOpenProfile,
  onOpenDoora,
  connected,
  totalUnread = 0,
}) {
  const [tab, setTab] = useState('chats');
  const [search, setSearch] = useState('');

  function handleContactClick(contact) {
    setTab('chats');
    onStartChat(contact);
  }

  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredContacts = contacts.filter((c) =>
    c.displayName.toLowerCase().includes(search.toLowerCase()) ||
    c.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full flex flex-col bg-[#1e293b] border-r border-slate-700/50 shrink-0 h-full">
      <div className="p-3 sm:p-4 border-b border-slate-700/50 safe-top">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-3 min-w-0 text-left hover:opacity-90 transition"
          >
            <Avatar name={user.displayName} color={user.avatarColor} avatarId={user.avatarId} size="md" status="online" />
            <div className="min-w-0">
              <p className="font-semibold text-white truncate">{user.displayName}</p>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
                {connected ? 'Connected' : 'Reconnecting...'}
              </p>
              {user.statusMessage && (
                <p className="text-xs text-slate-500 truncate mt-0.5">{user.statusMessage}</p>
              )}
            </div>
          </button>
          <button
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition"
            title="Sign out"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>

        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-9 pr-4 py-2 bg-[#0f172a] border border-slate-600/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          />
        </div>
      </div>

      <div className="flex border-b border-slate-700/50">
        <button
          onClick={() => setTab('chats')}
          className={`flex-1 py-2.5 text-sm font-medium transition relative ${
            tab === 'chats' ? 'text-brand-500 border-b-2 border-brand-500' : 'text-slate-400 hover:text-white'
          }`}
        >
          Chats
          {totalUnread > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-brand-500 text-white rounded-full">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('contacts')}
          className={`flex-1 py-2.5 text-sm font-medium transition ${
            tab === 'contacts' ? 'text-brand-500 border-b-2 border-brand-500' : 'text-slate-400 hover:text-white'
          }`}
        >
          Contacts
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'chats' && (
          <>
            {filteredConversations.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-8 px-4">
                No conversations yet. Start chatting from your contacts.
              </p>
            )}
            {filteredConversations.map((conv) => {
              const participant = conv.participants[0];
              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/30 transition text-left ${
                    activeConversationId === conv.id ? 'bg-brand-500/10 border-r-2 border-brand-500' : ''
                  }`}
                >
                  <Avatar
                    name={conv.name}
                    color={participant?.avatarColor}
                    avatarId={participant?.avatarId}
                    status={participant?.status}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-white truncate">{conv.name}</p>
                      {conv.lastMessage && (
                        <span className="text-xs text-slate-500 shrink-0 ml-2">
                          {formatTime(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-sm text-slate-400 truncate">
                        {conv.lastMessage
                          ? (conv.lastMessage.senderId === user.id ? 'You: ' : '') + conv.lastMessage.content
                          : 'No messages yet'}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="ml-2 shrink-0 w-5 h-5 flex items-center justify-center bg-brand-500 text-white text-xs font-bold rounded-full">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </>
        )}

        {tab === 'contacts' && (
          <>
            <div className="p-3">
              <button
                onClick={onAddContact}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-brand-500 hover:bg-brand-500/10 rounded-xl transition border border-dashed border-brand-500/30"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add contact
              </button>
            </div>
            {filteredContacts.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-8 px-4">
                No contacts yet. Search and add people to start chatting.
              </p>
            )}
            {filteredContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => handleContactClick(contact)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/30 transition text-left"
              >
                <Avatar
                  name={contact.displayName}
                  color={contact.avatarColor}
                  avatarId={contact.avatarId}
                  status={contact.status}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{contact.displayName}</p>
                  <p className="text-sm text-slate-400 truncate">
                    {contact.status === 'online' ? 'Online' : 'Offline'}
                    {contact.statusMessage ? ` · ${contact.statusMessage}` : ''}
                  </p>
                </div>
              </button>
            ))}
          </>
        )}
      </div>

      {onOpenDoora && <DooraLauncher onClick={onOpenDoora} />}
    </div>
  );
}
