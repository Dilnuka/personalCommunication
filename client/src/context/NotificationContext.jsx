import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  loadSettings,
  saveSettings,
  requestNotificationPermission,
  getNotificationPermission,
  showBrowserNotification,
} from '../services/notifications';
import {
  resumeAudio,
  startIncomingRing,
  stopIncomingRing,
  startOutgoingRing,
  stopOutgoingRing,
  stopAllCallSounds,
  playMessageChime,
  playCallConnected,
  playCallEnded,
  playTestSound,
} from '../services/sounds';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    function unlockAudio() {
      resumeAudio();
    }
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  const updateSettings = useCallback((partial) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  const enableBrowserNotifications = useCallback(async () => {
    const result = await requestNotificationPermission();
    if (result === 'granted') {
      updateSettings({ browserNotifications: true });
      return true;
    }
    updateSettings({ browserNotifications: false });
    return false;
  }, [updateSettings]);

  const notifyIncomingCall = useCallback(({ fromName, callType, onFocus }) => {
    const s = settingsRef.current;
    if (s.callSounds) startIncomingRing();
    if (s.browserNotifications) {
      showBrowserNotification({
        title: `Incoming ${callType} call`,
        body: `${fromName} is calling you`,
        tag: 'incoming-call',
        requireInteraction: true,
        onClick: onFocus,
      });
    }
  }, []);

  const notifyOutgoingCall = useCallback(() => {
    const s = settingsRef.current;
    if (s.callSounds) startOutgoingRing();
  }, []);

  const notifyCallConnected = useCallback(() => {
    stopAllCallSounds();
    const s = settingsRef.current;
    if (s.callSounds) playCallConnected();
  }, []);

  const notifyCallEnded = useCallback(() => {
    stopAllCallSounds();
    const s = settingsRef.current;
    if (s.callSounds) playCallEnded();
  }, []);

  const notifyNewMessage = useCallback(({ senderName, content, onFocus }) => {
    const s = settingsRef.current;
    if (s.messageSounds) playMessageChime();
    if (s.browserNotifications) {
      showBrowserNotification({
        title: senderName,
        body: content.length > 80 ? `${content.slice(0, 80)}…` : content,
        tag: `msg-${senderName}`,
        onClick: onFocus,
      });
    }
  }, []);

  const stopCallRinging = useCallback(() => {
    stopAllCallSounds();
  }, []);

  const testSound = useCallback((type) => {
    resumeAudio();
    playTestSound(type);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        settings,
        updateSettings,
        notificationPermission: getNotificationPermission(),
        enableBrowserNotifications,
        notifyIncomingCall,
        notifyOutgoingCall,
        notifyCallConnected,
        notifyCallEnded,
        notifyNewMessage,
        stopCallRinging,
        testSound,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
