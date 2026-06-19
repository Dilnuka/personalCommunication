import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';

function newCallId() {
  return crypto.randomUUID();
}

export function useWebRTC(socket, currentUserId) {
  const [callState, setCallState] = useState('idle');
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const callIdRef = useRef(null);
  const targetUserIdRef = useRef(null);
  const callStateRef = useRef('idle');
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    remoteStreamRef.current = null;
    callIdRef.current = null;
    targetUserIdRef.current = null;
    setCallState('idle');
    callStateRef.current = 'idle';
    setIncomingCall(null);
    setActiveCall(null);
    setIsMuted(false);
    setIsVideoOff(false);
  }, []);

  const attachStreams = useCallback(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
  }, []);

  const createPeerConnection = useCallback(async () => {
    const { iceServers } = await api.getIceServers();
    const pc = new RTCPeerConnection({ iceServers });

    pc.ontrack = (event) => {
      remoteStreamRef.current = event.streams[0];
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket && targetUserIdRef.current && callIdRef.current) {
        socket.emit('call:ice-candidate', {
          callId: callIdRef.current,
          targetUserId: targetUserIdRef.current,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        cleanup();
      }
    };

    pcRef.current = pc;
    return pc;
  }, [socket, cleanup]);

  const getMedia = useCallback(async (callType) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === 'video',
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    return stream;
  }, []);

  const startCall = useCallback(async (conversationId, targetUserId, targetName, callType) => {
    if (!socket || callStateRef.current !== 'idle') return;

    const callId = newCallId();
    callIdRef.current = callId;
    targetUserIdRef.current = targetUserId;

    try {
      setCallState('calling');
      callStateRef.current = 'calling';
      setActiveCall({ callId, conversationId, targetUserId, targetName, callType, isCaller: true });

      const stream = await getMedia(callType);
      const pc = await createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      socket.emit('call:invite', { conversationId, targetUserId, callType, callId });
    } catch (err) {
      console.error('Failed to start call:', err);
      cleanup();
      alert('Could not access camera/microphone. Please allow permissions.');
    }
  }, [socket, getMedia, createPeerConnection, cleanup]);

  const acceptCall = useCallback(async () => {
    if (!socket || !incomingCall) return;

    const { callId, conversationId, callType, fromUserId, fromName } = incomingCall;
    callIdRef.current = callId;
    targetUserIdRef.current = fromUserId;

    try {
      setCallState('connected');
      callStateRef.current = 'connected';
      setActiveCall({
        callId,
        conversationId,
        targetUserId: fromUserId,
        targetName: fromName,
        callType,
        isCaller: false,
      });
      setIncomingCall(null);

      const stream = await getMedia(callType);
      const pc = await createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      socket.emit('call:accept', { callId, targetUserId: fromUserId });
    } catch (err) {
      console.error('Failed to accept call:', err);
      socket.emit('call:reject', { callId, targetUserId: fromUserId });
      cleanup();
      alert('Could not access camera/microphone. Please allow permissions.');
    }
  }, [socket, incomingCall, getMedia, createPeerConnection, cleanup]);

  const rejectCall = useCallback(() => {
    if (!socket || !incomingCall) return;
    socket.emit('call:reject', {
      callId: incomingCall.callId,
      targetUserId: incomingCall.fromUserId,
    });
    setIncomingCall(null);
    setCallState('idle');
    callStateRef.current = 'idle';
  }, [socket, incomingCall]);

  const endCall = useCallback(() => {
    if (socket && targetUserIdRef.current && callIdRef.current) {
      socket.emit('call:end', {
        callId: callIdRef.current,
        targetUserId: targetUserIdRef.current,
      });
    }
    cleanup();
  }, [socket, cleanup]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsMuted((m) => !m);
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsVideoOff((v) => !v);
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    async function onIncoming(data) {
      if (callStateRef.current !== 'idle') {
        socket.emit('call:reject', { callId: data.callId, targetUserId: data.fromUserId });
        return;
      }
      setIncomingCall(data);
      setCallState('ringing');
      callStateRef.current = 'ringing';
    }

    async function onAccepted({ callId }) {
      if (callIdRef.current !== callId || !pcRef.current) return;
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      socket.emit('call:offer', {
        callId,
        targetUserId: targetUserIdRef.current,
        offer,
      });
      setCallState('connected');
      callStateRef.current = 'connected';
    }

    async function onOffer({ callId, offer }) {
      if (callIdRef.current !== callId || !pcRef.current) return;
      await pcRef.current.setRemoteDescription(offer);
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socket.emit('call:answer', {
        callId,
        targetUserId: targetUserIdRef.current,
        answer,
      });
    }

    async function onAnswer({ callId, answer }) {
      if (callIdRef.current !== callId || !pcRef.current) return;
      await pcRef.current.setRemoteDescription(answer);
    }

    async function onIceCandidate({ callId, candidate }) {
      if (callIdRef.current !== callId || !pcRef.current || !candidate) return;
      try {
        await pcRef.current.addIceCandidate(candidate);
      } catch {
        // ignore stale candidates
      }
    }

    function onRejected() {
      cleanup();
    }

    function onEnded() {
      cleanup();
    }

    socket.on('call:incoming', onIncoming);
    socket.on('call:accepted', onAccepted);
    socket.on('call:offer', onOffer);
    socket.on('call:answer', onAnswer);
    socket.on('call:ice-candidate', onIceCandidate);
    socket.on('call:rejected', onRejected);
    socket.on('call:ended', onEnded);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:accepted', onAccepted);
      socket.off('call:offer', onOffer);
      socket.off('call:answer', onAnswer);
      socket.off('call:ice-candidate', onIceCandidate);
      socket.off('call:rejected', onRejected);
      socket.off('call:ended', onEnded);
    };
  }, [socket, cleanup]);

  useEffect(() => {
    attachStreams();
  }, [activeCall, attachStreams]);

  useEffect(() => () => cleanup(), [cleanup]);

  return {
    callState,
    incomingCall,
    activeCall,
    isMuted,
    isVideoOff,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  };
}
