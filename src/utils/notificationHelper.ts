/**
 * Robust Cross-Platform Notification Helper
 * Fixes mobile Android Chrome "Uncaught TypeError: Failed to construct 'Notification': Illegal constructor.
 * Use ServiceWorkerRegistration.showNotification() instead."
 */

export interface SystemNotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  silent?: boolean;
}

export async function showSystemNotification(
  title: string,
  options?: SystemNotificationOptions
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  try {
    let permission = Notification.permission;
    if (permission === 'default') {
      try {
        permission = await Notification.requestPermission();
      } catch {
        // Some older browsers require callback syntax
        permission = await new Promise((resolve) => {
          Notification.requestPermission((p) => resolve(p));
        });
      }
    }

    if (permission !== 'granted') {
      return false;
    }

    // 1. If ServiceWorker registration is active, prefer ServiceWorkerRegistration.showNotification()
    // This is mandatory on Android Chrome / Mobile PWAs where new Notification() throws Illegal constructor
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && typeof registration.showNotification === 'function') {
          await registration.showNotification(title, options);
          return true;
        }
      } catch (swErr) {
        console.warn('[Notification] ServiceWorker getRegistration showNotification advisory:', swErr);
      }
    }

    // 2. Try window Notification constructor (standard on Desktop Chrome / Safari / Firefox)
    try {
      new Notification(title, options);
      return true;
    } catch (ctorErr) {
      console.warn('[Notification] Window Notification constructor failed (expected on mobile):', ctorErr);

      // 3. Fallback: wait for serviceWorker.ready if supported on mobile
      if ('serviceWorker' in navigator) {
        try {
          const readyRegistration = await navigator.serviceWorker.ready;
          if (readyRegistration && typeof readyRegistration.showNotification === 'function') {
            await readyRegistration.showNotification(title, options);
            return true;
          }
        } catch (readyErr) {
          console.warn('[Notification] serviceWorker.ready fallback failed:', readyErr);
        }
      }
    }
  } catch (err) {
    console.warn('[Notification] Notification dispatch error:', err);
  }

  return false;
}
