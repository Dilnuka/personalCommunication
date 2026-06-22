import { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';

const WELCOME = {
  role: 'assistant',
  content:
    "Hi! I'm Doora, your Connect assistant. I can answer general questions, explain how this app works, and help you find info about your contacts and users on the platform. What would you like to know?",
};

const SUGGESTIONS = [
  'Who are my contacts?',
  'Who is online right now?',
  'How do I start a video call?',
  'What can you help me with?',
];

function DooraIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  );
}

export function DooraLauncher({ onClick, compact = false }) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="doora-compact-btn group relative p-2 sm:p-2.5 rounded-xl transition shrink-0"
        aria-label="Open Doora AI assistant"
      >
        <span className="doora-compact-glow absolute inset-0 rounded-xl opacity-60 group-hover:opacity-100 transition-opacity" />
        <span className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-brand-500 text-white shadow-lg shadow-violet-500/30">
          <DooraIcon className="w-4 h-4" />
        </span>
      </button>
    );
  }

  return (
    <div className="shrink-0 p-3 sm:p-4 border-t border-slate-700/50 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={onClick}
        className="doora-launcher group relative w-full text-left"
        aria-label="Open Doora AI assistant"
      >
        <span className="relative flex items-center gap-3 rounded-2xl bg-[#0f172a]/95 border border-violet-500/20 hover:border-violet-500/35 px-3.5 py-3.5 overflow-hidden transition-colors">
          <span className="doora-launcher-shimmer absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

          <span className="relative shrink-0">
            <span className="doora-orb-glow absolute inset-0 rounded-xl blur-md opacity-70" />
            <span className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-brand-500 text-white shadow-xl shadow-violet-600/40 doora-orb-float">
              <DooraIcon className="w-5 h-5" />
            </span>
          </span>

          <span className="relative flex-1 min-w-0">
            <span className="flex items-center gap-2">
              <span className="font-semibold text-white tracking-tight">Doora</span>
              <span className="doora-ai-badge text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md text-violet-200">
                AI
              </span>
            </span>
            <span className="block text-xs text-slate-400 mt-0.5 truncate group-hover:text-slate-300 transition-colors">
              Ask anything about Connect
            </span>
          </span>

          <span className="relative shrink-0 w-8 h-8 rounded-full bg-slate-800/80 border border-slate-600/40 flex items-center justify-center text-slate-300 group-hover:text-white group-hover:border-violet-500/40 group-hover:bg-violet-500/10 transition-all">
            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </span>
      </button>
    </div>
  );
}

export default function DooraAssistant({ open, onClose }) {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function sendMessage(text) {
    const content = text.trim();
    if (!content || loading) return;

    setError('');
    const userMessage = { role: 'user', content };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const history = nextMessages.filter((m) => m.role === 'user' || m.role === 'assistant');
      const { reply } = await api.assistantChat(history);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(err.message || 'Doora could not respond');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage(input);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end sm:p-5">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-md doora-backdrop-in"
        onClick={onClose}
        aria-label="Close Doora"
      />

      <div className="relative w-full sm:w-[420px] h-[min(92dvh,680px)] sm:h-[min(82dvh,680px)] doora-panel-in flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-violet-500/20 shadow-2xl shadow-violet-950/50">
        <div className="doora-panel-header relative px-4 py-4 border-b border-white/5">
          <div className="absolute inset-0 doora-header-mesh opacity-90" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="doora-orb-glow absolute inset-0 rounded-2xl blur-lg opacity-80" />
                <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-brand-500 flex items-center justify-center text-white shadow-xl">
                  <DooraIcon />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-lg tracking-tight">Doora</h3>
                  <span className="doora-ai-badge text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                    AI
                  </span>
                </div>
                <p className="text-xs text-violet-200/70">Your smart Connect assistant</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#0b1220]/95">
          {messages.map((msg, i) => (
            <div
              key={`${msg.role}-${i}`}
              className={`flex doora-msg-in ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
            >
              {msg.role === 'assistant' && (
                <span className="shrink-0 w-7 h-7 mr-2 mt-1 rounded-lg bg-gradient-to-br from-violet-500/80 to-brand-500/80 flex items-center justify-center text-white">
                  <DooraIcon className="w-3.5 h-3.5" />
                </span>
              )}
              <div
                className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-brand-500 to-violet-600 text-white rounded-br-md shadow-lg shadow-brand-500/20'
                    : 'bg-[#1e293b]/90 text-slate-100 border border-slate-700/40 rounded-bl-md'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start doora-msg-in">
              <span className="shrink-0 w-7 h-7 mr-2 mt-1 rounded-lg bg-gradient-to-br from-violet-500/80 to-brand-500/80 flex items-center justify-center text-white">
                <DooraIcon className="w-3.5 h-3.5" />
              </span>
              <div className="px-4 py-3 rounded-2xl bg-[#1e293b]/90 border border-slate-700/40 text-slate-400 text-sm flex items-center gap-1.5">
                <span className="doora-thinking-dot w-1.5 h-1.5 rounded-full bg-violet-400" />
                <span className="doora-thinking-dot w-1.5 h-1.5 rounded-full bg-fuchsia-400" style={{ animationDelay: '0.15s' }} />
                <span className="doora-thinking-dot w-1.5 h-1.5 rounded-full bg-brand-400" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          )}
        </div>

        {messages.length <= 1 && !loading && (
          <div className="px-4 pb-2 flex flex-wrap gap-2 bg-[#0b1220]/95">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => sendMessage(s)}
                className="text-xs px-3 py-1.5 rounded-full border border-violet-500/25 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20 hover:border-violet-400/40 hover:text-white transition"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {error && (
          <p className="px-4 pb-2 text-xs text-red-400 bg-[#0b1220]/95">{error}</p>
        )}

        <form
          onSubmit={handleSubmit}
          className="p-4 border-t border-slate-700/50 bg-[#0f172a]/95 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Doora anything..."
              disabled={loading}
              autoFocus
              className="flex-1 px-4 py-2.5 bg-[#0b1220] border border-slate-600/50 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/30 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-4 py-2.5 bg-gradient-to-r from-violet-500 to-brand-500 hover:from-violet-400 hover:to-brand-400 disabled:opacity-40 text-white rounded-xl transition shadow-lg shadow-violet-500/25"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
