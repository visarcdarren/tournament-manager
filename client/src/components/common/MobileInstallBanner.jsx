import React, { useState } from 'react';
import { Download, Smartphone, X, Zap, Wifi, Users } from 'lucide-react';
import { shouldShowInstallPrompt, dismissInstallPrompt, detectIOS, detectMobile } from '@/utils/pwaUtils';

const MobileInstallBanner = () => {
  const [isVisible, setIsVisible] = useState(shouldShowInstallPrompt());
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  
  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);
  
  const isIOS = detectIOS();
  const isMobile = detectMobile();
  const canPromptInstall = (isInstallable || isIOS) && isMobile;

  const install = async () => {
    if (!deferredPrompt) return false;
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setIsInstallable(false);
      return outcome === 'accepted';
    } catch (error) {
      console.error('Installation failed:', error);
      return false;
    }
  };

  const handleInstallClick = async () => {
    if (await install()) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    dismissInstallPrompt(false); // Dismiss for a week
  };

  const handleRemindLater = () => {
    setIsVisible(false);
    dismissInstallPrompt(true); // Remind tomorrow
  };

  if (!isVisible || !canPromptInstall) {
    return null;
  }

  return (
    <div className="mx-4 mb-4 sm:mx-6 sm:mb-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 text-white relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-2 left-2 w-4 h-4 border-2 border-white rounded-full"></div>
          <div className="absolute top-8 right-4 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute bottom-4 left-8 w-3 h-3 border border-white rounded"></div>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="relative">
          <div className="flex items-start gap-3 mb-3">
            <div className="bg-white/20 rounded-lg p-2">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg leading-tight">
                Install Tournament Manager
              </h3>
              <p className="text-white/90 text-sm">
                Get the full app experience on your device
              </p>
            </div>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <Zap className="w-4 h-4 mx-auto mb-1 text-yellow-300" />
              <p className="text-xs text-white/80">Faster</p>
            </div>
            <div className="text-center">
              <Wifi className="w-4 h-4 mx-auto mb-1 text-green-300" />
              <p className="text-xs text-white/80">Offline</p>
            </div>
            <div className="text-center">
              <Users className="w-4 h-4 mx-auto mb-1 text-blue-300" />
              <p className="text-xs text-white/80">Full Screen</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {!isIOS && isInstallable ? (
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-white text-blue-600 font-medium py-2 px-4 rounded-lg hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Install
              </button>
            ) : (
              <div className="flex-1 bg-white/20 text-white font-medium py-2 px-4 rounded-lg text-center">
                <span className="text-xs">Use Share → Add to Home Screen</span>
              </div>
            )}
            
            <button
              onClick={handleRemindLater}
              className="px-4 py-2 text-white/80 hover:text-white text-sm font-medium"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileInstallBanner;