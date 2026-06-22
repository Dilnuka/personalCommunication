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

export default function DooraAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, open]);

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

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-violet-500 to-brand-500 text-white font-semibold shadow-lg shadow-brand-500/30 hover:scale-105 active:scale-95 transition-all"
          aria-label="Open Doora assistant"
        >
          <DooraIcon />
          <span className="hidden sm:inline">Doora</span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end sm:p-5">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Close Doora"
          />

          <div className="relative w-full sm:w-[400px] h-[min(92dvh,640px)] sm:h-[min(80dvh,640px)] bg-[#1e293b] border border-slate-700/60 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-gradient-to-r from-violet-500/10 to-brand-500/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-brand-500 flex items-center justify-center text-white shadow-lg">
                  <DooraIcon />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Doora</h3>
                  <p className="text-xs text-slate-400">Smart AI assistant</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((msg, i) => (
                <div
                  key={`${msg.role}-${i}`}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-brand-500 text-white rounded-br-md'
                        : 'bg-[#0f172a] text-slate-100 border border-slate-700/50 rounded-bl-md'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="px-3.5 py-2.5 rounded-2xl bg-[#0f172a] border border-slate-700/50 text-slate-400 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
                    Doora is thinking...
                  </div>
                </div>
              )}
            </div>

            {messages.length <= 1 && !loading && (
              <div className="px-4 pb-2 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendMessage(s)}
                    className="text-xs px-3 py-1.5 rounded-full bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {error && (
              <p className="px-4 pb-2 text-xs text-red-400">{error}</p>
            )}

            <form
              onSubmit={handleSubmit}
              className="p-4 border-t border-slate-700/50 bg-[#1e293b]/95 pb-[max(1rem,env(safe-area-inset-bottom))]"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Doora anything..."
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-[#0f172a] border border-slate-600/50 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-xl transition"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
