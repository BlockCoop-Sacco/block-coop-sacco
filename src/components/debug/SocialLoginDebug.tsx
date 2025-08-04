import { useState, useEffect } from 'react';
import { useAppKitState } from '@reown/appkit/react';
import { appKit } from '../../lib/appkit';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import {
  checkPopupBlocked,
  checkBrowserCompatibility,
  prepareBrowserForOAuth,
  handleSocialLoginError,
  monitorOAuthPopup
} from '../../lib/socialLoginHelpers';

export function SocialLoginDebug() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [socialLoginAttempts, setSocialLoginAttempts] = useState<any[]>([]);
  const [appKitReady, setAppKitReady] = useState(false);

  // Safely check if AppKit is ready before using hooks
  let appKitState: any = {};
  try {
    appKitState = useAppKitState();
    if (!appKitReady) setAppKitReady(true);
  } catch (error) {
    // AppKit not ready yet
    console.log('AppKit not ready for debug component');
  }

  useEffect(() => {
    // Monitor AppKit state changes
    const unsubscribe = appKit.subscribeState((state: any) => {
      setDebugInfo(prev => ({
        ...prev,
        lastStateChange: new Date().toISOString(),
        currentState: state,
        isLoading: state.loading,
        isOpen: state.open,
        selectedNetworkId: state.selectedNetworkId,
        activeChain: state.activeChain,
        initialized: state.initialized
      }));
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const testSocialLogin = async () => {
    const attemptId = Date.now();
    const attempt = {
      id: attemptId,
      timestamp: new Date().toISOString(),
      status: 'starting',
      error: null,
      duration: 0
    };

    setSocialLoginAttempts(prev => [attempt, ...prev.slice(0, 4)]);

    try {
      console.log('🧪 Starting social login test...');
      
      // Check if popup blockers are enabled
      const popup = window.open('', '_blank', 'width=1,height=1');
      if (!popup || popup.closed) {
        throw new Error('Popup blocked - please disable popup blocker');
      }
      popup.close();

      // Monitor for timeout
      const timeoutId = setTimeout(() => {
        setSocialLoginAttempts(prev => 
          prev.map(a => a.id === attemptId ? {
            ...a,
            status: 'timeout',
            error: 'Social login timed out after 30 seconds',
            duration: 30000
          } : a)
        );
      }, 30000);

      const startTime = Date.now();
      
      // Open AppKit modal
      appKit.open();
      
      // Update attempt status
      setSocialLoginAttempts(prev => 
        prev.map(a => a.id === attemptId ? {
          ...a,
          status: 'modal_opened',
          duration: Date.now() - startTime
        } : a)
      );

      clearTimeout(timeoutId);
      
    } catch (error: any) {
      console.error('🧪 Social login test failed:', error);
      setSocialLoginAttempts(prev => 
        prev.map(a => a.id === attemptId ? {
          ...a,
          status: 'error',
          error: error.message,
          duration: Date.now() - Date.now()
        } : a)
      );
    }
  };

  const runBrowserCompatibilityCheck = async () => {
    const checks = await checkBrowserCompatibility();
    const popupBlocked = checkPopupBlocked();
    const browserReady = prepareBrowserForOAuth();

    setDebugInfo(prev => ({
      ...prev,
      browserChecks: {
        ...checks,
        popupBlocked,
        browserReady: browserReady.success,
        browserIssues: browserReady.issues
      }
    }));
  };

  useEffect(() => {
    runBrowserCompatibilityCheck();
  }, []);

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-lg z-50">
      <Card>
        <CardHeader>
          <h3 className="font-bold text-sm">🔍 Social Login Debug</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current State */}
          <div>
            <h4 className="font-semibold text-xs mb-2">AppKit State</h4>
            <div className="text-xs bg-gray-50 p-2 rounded">
              <div>Loading: {String(appKitState.loading)}</div>
              <div>Open: {String(appKitState.open)}</div>
              <div>Initialized: {String(appKitState.initialized)}</div>
              <div>Network: {appKitState.selectedNetworkId}</div>
            </div>
          </div>

          {/* Browser Compatibility */}
          {debugInfo.browserChecks && (
            <div>
              <h4 className="font-semibold text-xs mb-2">Browser Checks</h4>
              <div className="text-xs bg-gray-50 p-2 rounded space-y-1">
                <div>Popup: {debugInfo.browserChecks.popupSupport ? '✅' : '❌'}</div>
                <div>HTTPS: {debugInfo.browserChecks.httpsConnection ? '✅' : '❌'}</div>
                <div>Cookies: {debugInfo.browserChecks.cookiesEnabled ? '✅' : '❌'}</div>
                <div>Storage: {debugInfo.browserChecks.localStorageSupport ? '✅' : '❌'}</div>
              </div>
            </div>
          )}

          {/* Test Button */}
          <Button 
            onClick={testSocialLogin}
            size="sm"
            className="w-full"
          >
            Test Social Login
          </Button>

          {/* Recent Attempts */}
          {socialLoginAttempts.length > 0 && (
            <div>
              <h4 className="font-semibold text-xs mb-2">Recent Attempts</h4>
              <div className="space-y-1">
                {socialLoginAttempts.map(attempt => (
                  <div key={attempt.id} className="text-xs bg-gray-50 p-2 rounded">
                    <div className="flex justify-between">
                      <span>{attempt.status}</span>
                      <span>{attempt.duration}ms</span>
                    </div>
                    {attempt.error && (
                      <div className="text-red-600 mt-1">{attempt.error}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clear Debug */}
          <Button 
            onClick={() => {
              setDebugInfo({});
              setSocialLoginAttempts([]);
            }}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Clear Debug Info
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
