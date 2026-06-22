import { createPortal } from 'react-dom';

function CallTypeIcon({ callType, className = 'w-8 h-8' }) {
  if (callType === 'video') {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function RingingAvatar({ name, callType, variant = 'incoming' }) {
  const initial = name?.[0]?.toUpperCase() || '?';
  const isIncoming = variant === 'incoming';

  return (
    <div className="relative w-36 h-36 mx-auto mb-8">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`call-ripple-ring absolute inset-0 rounded-full border-2 ${
            isIncoming ? 'border-emerald-400/50' : 'border-brand-400/40'
          }`}
          style={{ animationDelay: `${i * 0.75}s` }}
        />
      ))}
      <div
        className={`relative z-10 w-full h-full rounded-full flex flex-col items-center justify-center text-white shadow-2xl ${
          isIncoming
            ? 'call-avatar-pulse-incoming bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600'
            : 'call-avatar-pulse bg-gradient-to-br from-brand-400 via-brand-500 to-indigo-600'
        }`}
      >
        <span className="text-4xl font-bold tracking-tight">{initial}</span>
        <span className="mt-1 opacity-90">
          <CallTypeIcon callType={callType} className="w-5 h-5" />
        </span>
      </div>
    </div>
  );
}

function StatusDots({ label }) {
  return (
    <p className="text-slate-300 text-sm font-medium flex items-center justify-center gap-1">
      {label}
      <span className="inline-flex gap-0.5 ml-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="call-status-dot inline-block w-1 h-1 rounded-full bg-current"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </span>
    </p>
  );
}

function CallActionButton({ onClick, variant, label, children }) {
  const styles = {
    accept: 'bg-gradient-to-b from-emerald-400 to-green-600 hover:from-emerald-300 hover:to-green-500 shadow-lg shadow-green-500/30',
    decline: 'bg-gradient-to-b from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 shadow-lg shadow-red-500/25',
    end: 'bg-gradient-to-b from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 shadow-lg shadow-red-500/25',
    control: 'bg-slate-700/90 hover:bg-slate-600 text-white backdrop-blur-sm',
    controlActive: 'bg-red-500/25 text-red-300 ring-1 ring-red-400/40',
  };

  const isRound = variant === 'accept' || variant === 'decline';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`transition-all active:scale-95 ${
        isRound
          ? `flex flex-col items-center gap-2 ${variant === 'accept' ? styles.accept : styles.decline} text-white rounded-2xl px-7 py-4 min-w-[108px]`
          : variant === 'end'
            ? `${styles.end} text-white rounded-full px-6 py-4 flex items-center gap-2`
            : `${styles.control} p-4 rounded-full`
      }`}
      aria-label={label}
      title={label}
    >
      {children}
      {isRound && <span className="text-sm font-semibold">{label}</span>}
    </button>
  );
}

export default function CallOverlay({
  callState,
  incomingCall,
  activeCall,
  isMuted,
  isVideoOff,
  localVideoRef,
  remoteVideoRef,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleVideo,
}) {
  if (callState === 'idle') return null;

  let content = null;

  if (callState === 'ringing' && incomingCall) {
    content = (
      <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b1220] via-[#111827] to-[#0f172a]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,197,94,0.18),transparent_55%)]" />
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 w-80 h-80 rounded-full bg-brand-500/10 blur-3xl" />

        <div className="relative z-10 w-full max-w-sm mx-4 text-center px-6 py-10 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/90 mb-2">
            Incoming {incomingCall.callType} call
          </p>
          <RingingAvatar name={incomingCall.fromName} callType={incomingCall.callType} variant="incoming" />
          <h3 className="text-2xl font-semibold text-white mb-1">{incomingCall.fromName}</h3>
          <StatusDots label="Ringing" />
          <div className="flex gap-4 justify-center mt-10">
            <CallActionButton onClick={onReject} variant="decline" label="Decline">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.516l2.257-1.13a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
              </svg>
            </CallActionButton>
            <CallActionButton onClick={onAccept} variant="accept" label="Accept">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </CallActionButton>
          </div>
        </div>
      </div>
    );
  } else if (activeCall) {
    const isVideo = activeCall.callType === 'video';
    const isCalling = callState === 'calling';
    const isConnected = callState === 'connected';
    const statusText = isCalling ? 'Calling' : isConnected ? 'Connected' : 'Connecting';

    content = (
      <div className="fixed inset-0 z-[100] bg-[#0b1220] flex flex-col h-[100dvh]">
        <div className="flex-1 relative min-h-0 overflow-hidden">
          {isVideo && isConnected ? (
            <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover bg-black"
              />
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute bottom-24 right-4 w-36 h-28 sm:w-40 sm:h-28 rounded-xl object-cover border-2 border-slate-600 shadow-lg z-10"
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-[#0b1220] via-[#111827] to-[#0f172a]" />
              <div className={`absolute inset-0 ${isCalling ? 'bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.2),transparent_60%)]' : 'bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.12),transparent_60%)]'}`} />

              <div className="relative z-10 flex flex-col items-center px-6">
                {isCalling ? (
                  <RingingAvatar name={activeCall.targetName} callType={activeCall.callType} variant="outgoing" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-400 to-indigo-600 flex items-center justify-center mb-6 shadow-xl shadow-brand-500/20">
                    <span className="text-3xl font-bold text-white">
                      {activeCall.targetName?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                <h3 className="text-2xl font-semibold text-white">{activeCall.targetName}</h3>
                {isCalling ? (
                  <div className="mt-3">
                    <StatusDots label={statusText} />
                  </div>
                ) : (
                  <p className={`mt-2 text-sm font-medium ${isConnected ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {statusText}
                    {isConnected && (
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 ml-2 align-middle animate-pulse" />
                    )}
                  </p>
                )}
              </div>
              <audio ref={remoteVideoRef} autoPlay playsInline className="hidden" />
            </div>
          )}

          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 backdrop-blur-md rounded-full z-10 border border-white/10">
            <span className="text-white text-sm font-medium flex items-center gap-2">
              {isCalling && <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />}
              {activeCall.targetName} · {statusText}
            </span>
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-center gap-5 px-6 py-5 pb-8 bg-[#1e293b]/95 backdrop-blur-md border-t border-slate-700/50 shadow-2xl">
          <button
            onClick={onToggleMute}
            className={`p-4 rounded-full transition ${isMuted ? 'bg-red-500/20 text-red-400 ring-1 ring-red-400/30' : 'bg-slate-600 text-white hover:bg-slate-500'}`}
            title={isMuted ? 'Unmute' : 'Mute'}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMuted ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              )}
            </svg>
          </button>

          {isVideo && (
            <button
              onClick={onToggleVideo}
              className={`p-4 rounded-full transition ${isVideoOff ? 'bg-red-500/20 text-red-400 ring-1 ring-red-400/30' : 'bg-slate-600 text-white hover:bg-slate-500'}`}
              title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
              aria-label={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          )}

          <CallActionButton onClick={onEnd} variant="end" label="End call">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.516l2.257-1.13a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
            </svg>
            <span className="font-semibold text-sm">End</span>
          </CallActionButton>
        </div>
      </div>
    );
  }

  if (!content) return null;
  return createPortal(content, document.body);
}
