import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone, Plus } from 'lucide-react';

const PWAInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile device
    const detectMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ||
             (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /MacIntel/.test(navigator.platform)) ||
             window.innerWidth <= 768;
    };

    // Detect iOS
    const detectIOS = () => {
      return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
             (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /MacIntel/.test(navigator.platform));
    };

    // Check if app is already installed (standalone mode)
    const checkStandalone = () => {
      return window.matchMedia('(display-mode: standalone)').matches ||
             window.navigator.standalone ||
             document.referrer.includes('android-app://');
    };

    // Check if user has already dismissed the prompt (expires after 7 days)
    const checkUserDismissed = () => {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (dismissed) {
        const dismissedDate = new Date(dismissed);
        const now = new Date();
        const daysSinceDismissed = (now - dismissedDate) / (1000 * 60 * 60 * 24);
        return daysSinceDismissed < 7; // Show again after 7 days
      }
      return false;
    };
    
    const mobile = detectMobile();
    const ios = detectIOS();
    const standalone = checkStandalone();
    const dismissed = checkUserDismissed();
    
    setIsMobile(mobile);
    setIsIOS(ios);
    setIsStandalone(standalone);

    // Show prompt if mobile, not standalone, and not recently dismissed
    if (mobile && !standalone && !dismissed) {
      // For iOS, show after a short delay since beforeinstallprompt isn't supported
      if (ios) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    }

    // Listen for the beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      if (mobile && !standalone && !dismissed) {
        setTimeout(() => setShowPrompt(true), 2000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Hide prompt if app gets installed
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.removeItem('pwa-install-dismissed');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // For Android/Chrome
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          setShowPrompt(false);
        }
        setDeferredPrompt(null);
      } catch (error) {
        console.error('Installation failed:', error);
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  const handleRemindLater = () => {
    setShowPrompt(false);
    // Set a shorter dismissal time for "remind later" (1 day)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    localStorage.setItem('pwa-install-dismissed', tomorrow.toISOString());
  };

  if (!showPrompt || !isMobile || isStandalone) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-card border rounded-lg shadow-xl w-full max-w-md mx-auto sm:mx-0 transform transition-all duration-300 ease-out">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Install Tournament Manager</h3>
              <p className="text-sm text-muted-foreground">Add to your home screen</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-3">
              Get the full tournament experience with:
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Faster loading and offline access</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Full-screen experience without browser bars</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Quick access from your home screen</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span>Perfect for tournament directors on the go</span>
              </div>
            </div>
          </div>

          {/* Instructions */}
          {isIOS ? (
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">To install on iOS:</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>1.</span>
                  <span>Tap the share button in Safari</span>
                  <div className="w-4 h-4 border rounded-sm flex items-center justify-center">
                    <div className="w-2 h-2 border-t border-r transform rotate-45"></div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span>2.</span>
                  <span>Select "Add to Home Screen"</span>
                  <Plus className="w-3 h-3" />
                </div>
                <div className="flex items-center gap-2">
                  <span>3.</span>
                  <span>Tap "Add" to confirm</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Installation available:</p>
              <p className="text-xs text-muted-foreground">
                Click "Install" below or look for the install icon in your browser's address bar.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t space-y-2">
          {!isIOS && deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              Install App
            </button>
          )}
          
          <div className="flex gap-2">
            <button
              onClick={handleRemindLater}
              className="flex-1 bg-muted text-muted-foreground hover:bg-muted/80 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
            >
              Remind Later
            </button>
            <button
              onClick={handleDismiss}
              className="flex-1 bg-muted text-muted-foreground hover:bg-muted/80 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;