let audioContext = null;
let incomingRingInterval = null;
let outgoingRingInterval = null;
let activeOscillators = [];

const DEFAULT_VOLUME = 0.35;

function getContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

export async function resumeAudio() {
  const ctx = getContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
}

function stopOscillators() {
  activeOscillators.forEach(({ osc, gain }) => {
    try {
      osc.stop();
      osc.disconnect();
      gain.disconnect();
    } catch {
      // already stopped
    }
  });
  activeOscillators = [];
}

function playTone(frequencies, duration, volume = DEFAULT_VOLUME, type = 'sine') {
  const ctx = getContext();
  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(volume, now + 0.02);
  masterGain.gain.linearRampToValueAtTime(0, now + duration);
  masterGain.connect(ctx.destination);

  const freqs = Array.isArray(frequencies) ? frequencies : [frequencies];
  freqs.forEach((freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.value = 1 / freqs.length;
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + duration);
    activeOscillators.push({ osc, gain });
  });

  setTimeout(() => {
    activeOscillators = activeOscillators.filter((o) => !o.osc.context || o.osc.context.state === 'running');
  }, duration * 1000 + 50);
}

function playRingBurst() {
  playTone([440, 480], 0.9, 0.28);
}

function playRingbackBurst() {
  playTone([350, 440], 0.55, 0.18);
}

export function startIncomingRing() {
  stopIncomingRing();
  resumeAudio();
  playRingBurst();
  incomingRingInterval = setInterval(playRingBurst, 2800);
}

export function stopIncomingRing() {
  if (incomingRingInterval) {
    clearInterval(incomingRingInterval);
    incomingRingInterval = null;
  }
}

export function startOutgoingRing() {
  stopOutgoingRing();
  resumeAudio();
  playRingbackBurst();
  outgoingRingInterval = setInterval(playRingbackBurst, 2200);
}

export function stopOutgoingRing() {
  if (outgoingRingInterval) {
    clearInterval(outgoingRingInterval);
    outgoingRingInterval = null;
  }
}

export function stopAllCallSounds() {
  stopIncomingRing();
  stopOutgoingRing();
  stopOscillators();
}

export function playMessageChime() {
  resumeAudio();
  const ctx = getContext();
  const now = ctx.currentTime;
  const notes = [523.25, 659.25];

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + i * 0.07;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.4);
  });
}

export function playCallConnected() {
  resumeAudio();
  playTone([523.25, 783.99], 0.25, 0.2);
}

export function playCallEnded() {
  resumeAudio();
  playTone([392], 0.2, 0.15);
}

export function playTestSound(type) {
  resumeAudio();
  if (type === 'message') playMessageChime();
  else if (type === 'call') playRingBurst();
  else playRingbackBurst();
}
