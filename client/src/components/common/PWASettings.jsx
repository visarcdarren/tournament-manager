import React, { useState, useEffect } from 'react';
import { Settings, Smartphone, Monitor, Download, CheckCircle2, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getDeviceInfo, shouldShowInstallPrompt, dismissInstallPrompt } from '@/utils/pwaUtils';
import usePWA from '@/hooks/usePWA';

const PWASettings = () => {
  const [deviceInfo, setDeviceInfo] = useState(getDeviceInfo());
  const { install, canPromptInstall, isInstallable, isInstalled } = usePWA();

  useEffect(() => {
    // Update device info on window resize
    const handleResize = () => {
      setDeviceInfo(getDeviceInfo());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleInstall = async () => {
    try {
      const success = await install();
      if (success) {
        setDeviceInfo(getDeviceInfo());
      }
    } catch (error) {
      console.error('Installation failed:', error);
    }
  };

  const resetInstallPrompt = () => {
    localStorage.removeItem('pwa-install-dismissed');
    window.location.reload();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          App Installation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
          {isInstalled ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <div className="flex-1">
                <p className="font-medium text-green-700 dark:text-green-400">
                  App Installed
                </p>
                <p className="text-sm text-muted-foreground">
                  Running in standalone mode
                </p>
              </div>
              <Badge variant="secondary">Installed</Badge>
            </>
          ) : (
            <>
              <div className="w-5 h-5 text-muted-foreground">
                {deviceInfo.isMobile ? <Smartphone /> : <Monitor />}
              </div>
              <div className="flex-1">
                <p className="font-medium">Browser Mode</p>
                <p className="text-sm text-muted-foreground">
                  {deviceInfo.isMobile ? 'Mobile web browser' : 'Desktop browser'}
                </p>
              </div>
              <Badge variant="outline">
                {deviceInfo.isMobile ? 'Mobile' : 'Desktop'}
              </Badge>
            </>
          )}
        </div>

        {/* Installation Actions */}
        {!isInstalled && (
          <div className="space-y-3">
            {canPromptInstall && (
              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="w-4 h-4 text-primary" />
                  <span className="font-medium">Install Available</span>
                </div>
                
                {deviceInfo.isIOS ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      To install on iOS, use Safari's share menu:
                    </p>
                    <ol className="text-sm space-y-1 text-muted-foreground ml-4">
                      <li>1. Tap the Share button in Safari</li>
                      <li>2. Select "Add to Home Screen"</li>
                      <li>3. Tap "Add" to confirm</li>
                    </ol>
                  </div>
                ) : isInstallable ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Install for the best experience:
                    </p>
                    <Button onClick={handleInstall} className="w-full">
                      <Download className="w-4 h-4 mr-2" />
                      Install App
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Install option will appear when available
                  </p>
                )}
              </div>
            )}

            {/* Reset prompt button for testing */}
            <Button 
              variant="outline" 
              onClick={resetInstallPrompt}
              className="w-full text-xs"
            >
              <Info className="w-3 h-3 mr-2" />
              Reset Install Prompt (for testing)
            </Button>
          </div>
        )}

        {/* Device Information */}
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium mb-2">
            Device Information
          </summary>
          <div className="space-y-2 p-3 bg-muted rounded-lg">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-medium">Platform:</span> {deviceInfo.platform}
              </div>
              <div>
                <span className="font-medium">Screen:</span> {deviceInfo.screenWidth} × {deviceInfo.screenHeight}
              </div>
              <div>
                <span className="font-medium">Touch Points:</span> {deviceInfo.touchPoints}
              </div>
              <div>
                <span className="font-medium">User Agent:</span>
              </div>
            </div>
            <div className="text-xs font-mono bg-background p-2 rounded overflow-auto">
              {deviceInfo.userAgent}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>Mobile: <Badge variant={deviceInfo.isMobile ? "default" : "outline"} className="text-xs">
                {deviceInfo.isMobile ? 'Yes' : 'No'}
              </Badge></div>
              <div>iOS: <Badge variant={deviceInfo.isIOS ? "default" : "outline"} className="text-xs">
                {deviceInfo.isIOS ? 'Yes' : 'No'}
              </Badge></div>
              <div>Android: <Badge variant={deviceInfo.isAndroid ? "default" : "outline"} className="text-xs">
                {deviceInfo.isAndroid ? 'Yes' : 'No'}
              </Badge></div>
              <div>Standalone: <Badge variant={deviceInfo.isStandalone ? "default" : "outline"} className="text-xs">
                {deviceInfo.isStandalone ? 'Yes' : 'No'}
              </Badge></div>
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  );
};

export default PWASettings;