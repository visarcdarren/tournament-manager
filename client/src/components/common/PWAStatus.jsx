import React from 'react';
import { Smartphone, Monitor, Download, CheckCircle2 } from 'lucide-react';
import { getDeviceInfo, getInstallInstructions } from '@/utils/pwaUtils';

const PWAStatus = () => {
  const deviceInfo = getDeviceInfo();
  const instructions = getInstallInstructions();

  return (
    <div className="space-y-4">
      {/* Current Status */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
        {deviceInfo.isStandalone ? (
          <>
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">App Installed</p>
              <p className="text-sm text-muted-foreground">
                Running in standalone mode
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-5 h-5 text-muted-foreground">
              {deviceInfo.isMobile ? <Smartphone /> : <Monitor />}
            </div>
            <div>
              <p className="font-medium">Running in Browser</p>
              <p className="text-sm text-muted-foreground">
                {deviceInfo.isMobile ? 'Mobile browser' : 'Desktop browser'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Installation Instructions */}
      {!deviceInfo.isStandalone && deviceInfo.canInstall && (
        <div className="p-3 rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <Download className="w-4 h-4" />
            <h3 className="font-medium">Install as App</h3>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            {instructions.steps.map((step, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="font-mono text-xs bg-muted px-1 rounded">
                  {index + 1}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Device Information */}
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Device Information
        </summary>
        <div className="mt-2 p-2 bg-muted rounded text-xs font-mono space-y-1">
          <div>Platform: {deviceInfo.platform}</div>
          <div>Screen: {deviceInfo.screenWidth} × {deviceInfo.screenHeight}</div>
          <div>Touch Points: {deviceInfo.touchPoints}</div>
          <div>Mobile: {deviceInfo.isMobile ? 'Yes' : 'No'}</div>
          <div>iOS: {deviceInfo.isIOS ? 'Yes' : 'No'}</div>
          <div>Android: {deviceInfo.isAndroid ? 'Yes' : 'No'}</div>
          <div>Standalone: {deviceInfo.isStandalone ? 'Yes' : 'No'}</div>
        </div>
      </details>
    </div>
  );
};

export default PWAStatus;