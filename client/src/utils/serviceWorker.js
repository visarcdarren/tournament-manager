/**
 * PWA Service Worker Registration and Update Handler
 */

export const registerSW = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        // Check if SW is already registered
        const registration = await navigator.serviceWorker.getRegistration();
        
        if (registration) {
          console.log('Service Worker already registered:', registration);
          
          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available
                  showUpdateAvailable();
                }
              });
            }
          });
        }
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    });
  }
};

const showUpdateAvailable = () => {
  // Show a toast or modal to inform user of update
  if (window.toast) {
    window.toast({
      title: 'Update Available',
      description: 'A new version is ready. Refresh to update.',
      action: {
        text: 'Refresh',
        onClick: () => window.location.reload()
      }
    });
  } else {
    // Fallback notification
    if (confirm('A new version is available. Refresh now?')) {
      window.location.reload();
    }
  }
};

export const unregisterSW = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
      });
    });
  }
};

export const checkSWStatus = async () => {
  if (!('serviceWorker' in navigator)) {
    return { supported: false, registered: false, active: false };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    
    return {
      supported: true,
      registered: !!registration,
      active: !!(registration && registration.active),
      updateAvailable: !!(registration && registration.waiting)
    };
  } catch (error) {
    return { supported: true, registered: false, active: false, error: error.message };
  }
};

// Enhanced PWA capabilities detection
export const getPWACapabilities = () => {
  const capabilities = {
    serviceWorker: 'serviceWorker' in navigator,
    notification: 'Notification' in window,
    pushManager: 'PushManager' in window,
    backgroundSync: 'sync' in window.ServiceWorkerRegistration?.prototype || false,
    periodicBackgroundSync: 'periodicSync' in window.ServiceWorkerRegistration?.prototype || false,
    webShare: 'share' in navigator,
    clipboard: 'clipboard' in navigator,
    wakeLock: 'wakeLock' in navigator,
    fullscreen: 'requestFullscreen' in document.documentElement
  };

  return capabilities;
};