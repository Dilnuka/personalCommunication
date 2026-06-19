import { createPortal } from 'react-dom';

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
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-[#1e293b] rounded-2xl border border-slate-700/50 p-8 text-center max-w-sm w-full mx-4 shadow-2xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-500/20 flex items-center justify-center animate-pulse">
            {incomingCall.callType === 'video' ? (
              <svg className="w-8 h-8 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            )}
          </div>
          <h3 className="text-xl font-semibold text-white mb-1">Incoming {incomingCall.callType} call</h3>
          <p className="text-slate-400 mb-6">from {incomingCall.fromName}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onReject}
              className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition"
            >
              Decline
            </button>
            <button
              onClick={onAccept}
              className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    );
  } else if (activeCall) {
    const isVideo = activeCall.callType === 'video';
    const statusText =
      callState === 'calling' ? 'Calling...' :
      callState === 'connected' ? 'Connected' : 'Connecting...';

    content = (
      <div className="fixed inset-0 z-[100] bg-[#0b1220] flex flex-col h-[100dvh]">
        <div className="flex-1 relative min-h-0 overflow-hidden">
          {isVideo ? (
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
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-24 h-24 rounded-full bg-brand-500/20 flex items-center justify-center mb-4">
                <span className="text-3xl font-bold text-brand-500">
                  {activeCall.targetName?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <h3 className="text-2xl font-semibold text-white">{activeCall.targetName}</h3>
              <p className="text-slate-400 mt-2">{statusText}</p>
              <audio ref={remoteVideoRef} autoPlay playsInline className="hidden" />
            </div>
          )}

          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 rounded-full z-10">
            <span className="text-white text-sm font-medium">
              {activeCall.targetName} · {statusText}
            </span>
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-center gap-5 px-6 py-5 pb-8 bg-[#1e293b] border-t border-slate-700/50 shadow-2xl">
          <button
            onClick={onToggleMute}
            className={`p-4 rounded-full transition ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-slate-600 text-white hover:bg-slate-500'}`}
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
              className={`p-4 rounded-full transition ${isVideoOff ? 'bg-red-500/20 text-red-400' : 'bg-slate-600 text-white hover:bg-slate-500'}`}
              title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
              aria-label={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          )}

          <button
            onClick={onEnd}
            className="px-6 py-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition shadow-lg flex items-center gap-2"
            title="End call"
            aria-label="End call"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.516l2.257-1.13a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
            </svg>
            <span className="font-semibold text-sm">End</span>
          </button>
        </div>
      </div>
    );
  }

  if (!content) return null;
  return createPortal(content, document.body);
}
