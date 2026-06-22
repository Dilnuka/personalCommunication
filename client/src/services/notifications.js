const SETTINGS_KEY = 'connect_notification_settings';

export const defaultSettings = {
  messageSounds: true,
  callSounds: true,
  browserNotifications: true,
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings };
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

export function showBrowserNotification({ title, body, tag, onClick, requireInteraction = false }) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return null;
  if (document.visibilityState === 'visible') return null;

  try {
    const notification = new Notification(title, {
      body,
      tag,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      requireInteraction,
      silent: true,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      onClick?.();
    };

    if (!requireInteraction) {
      setTimeout(() => notification.close(), 5000);
    }

    return notification;
  } catch {
    return null;
  }
}
