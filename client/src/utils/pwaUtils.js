/**
 * Mobile and PWA detection utilities
 */

export const detectMobile = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  
  // Check user agent
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // Check for touch and screen size (includes iPad Pro detection)
  const isTouchDevice = navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /MacIntel/.test(navigator.platform);
  
  // Check viewport width
  const isSmallScreen = window.innerWidth <= 768;
  
  return isMobileUA || isTouchDevice || isSmallScreen;
};

export const detectIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
         (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /MacIntel/.test(navigator.platform));
};

export const detectAndroid = () => {
  return /Android/i.test(navigator.userAgent);
};

export const isStandalone = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone ||
         document.referrer.includes('android-app://');
};

export const canInstallPWA = () => {
  return !isStandalone() && detectMobile();
};

export const getInstallInstructions = () => {
  if (detectIOS()) {
    return {
      platform: 'ios',
      steps: [
        'Tap the Share button in Safari',
        'Scroll down and tap "Add to Home Screen"',
        'Tap "Add" to confirm'
      ]
    };
  } else if (detectAndroid()) {
    return {
      platform: 'android',
      steps: [
        'Look for the install icon in your browser',
        'Or tap "Install" when prompted',
        'Follow the installation steps'
      ]
    };
  } else {
    return {
      platform: 'desktop',
      steps: [
        'Look for the install icon in your browser address bar',
        'Or check browser menu for "Install" option',
        'Follow the installation prompts'
      ]
    };
  }
};

export const shouldShowInstallPrompt = () => {
  // Don't show if already installed
  if (isStandalone()) return false;
  
  // Don't show on desktop
  if (!detectMobile()) return false;
  
  // Check if user recently dismissed
  const dismissed = localStorage.getItem('pwa-install-dismissed');
  if (dismissed) {
    const dismissedDate = new Date(dismissed);
    const now = new Date();
    const daysSinceDismissed = (now - dismissedDate) / (1000 * 60 * 60 * 24);
    if (daysSinceDismissed < 7) return false; // Don't show for 7 days
  }
  
  return true;
};

export const dismissInstallPrompt = (remindLater = false) => {
  const date = new Date();
  if (remindLater) {
    date.setDate(date.getDate() + 1); // Remind tomorrow
  } else {
    date.setDate(date.getDate() + 7); // Don't show for a week
  }
  localStorage.setItem('pwa-install-dismissed', date.toISOString());
};

// Enhanced device info
export const getDeviceInfo = () => {
  return {
    isMobile: detectMobile(),
    isIOS: detectIOS(),
    isAndroid: detectAndroid(),
    isStandalone: isStandalone(),
    canInstall: canInstallPWA(),
    userAgent: navigator.userAgent,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    touchPoints: navigator.maxTouchPoints || 0,
    platform: navigator.platform
  };
};

export default {
  detectMobile,
  detectIOS,
  detectAndroid,
  isStandalone,
  canInstallPWA,
  getInstallInstructions,
  shouldShowInstallPrompt,
  dismissInstallPrompt,
  getDeviceInfo
};