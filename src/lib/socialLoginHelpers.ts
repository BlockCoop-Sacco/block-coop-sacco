/**
 * Social Login Helper Functions
 * Utilities to improve OAuth flow reliability and handle common issues
 */

/**
 * Check if popups are blocked by the browser
 */
export function checkPopupBlocked(): boolean {
  try {
    const popup = window.open('', '_blank', 'width=1,height=1,top=0,left=0');
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      return true; // Popup is blocked
    }
    popup.close();
    return false; // Popup is allowed
  } catch (error) {
    return true; // Error indicates popup is blocked
  }
}

/**
 * Check browser compatibility for OAuth flows
 */
export function checkBrowserCompatibility() {
  const checks = {
    popupSupport: typeof window.open === 'function',
    localStorageSupport: (() => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
      } catch {
        return false;
      }
    })(),
    sessionStorageSupport: (() => {
      try {
        sessionStorage.setItem('test', 'test');
        sessionStorage.removeItem('test');
        return true;
      } catch {
        return false;
      }
    })(),
    cookiesEnabled: navigator.cookieEnabled,
    httpsConnection: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
    thirdPartyCookies: (() => {
      // Basic check for third-party cookie support
      try {
        document.cookie = 'test=1; SameSite=None; Secure';
        const hasThirdParty = document.cookie.includes('test=1');
        document.cookie = 'test=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        return hasThirdParty;
      } catch {
        return false;
      }
    })(),
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    referrer: document.referrer || 'none',
    isIncognito: (() => {
      // Detect incognito/private mode
      try {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          return navigator.storage.estimate().then(estimate => 
            estimate.quota && estimate.quota < 120000000
          );
        }
        return Promise.resolve(false);
      } catch {
        return Promise.resolve(false);
      }
    })()
  };

  return checks;
}

/**
 * Prepare browser for OAuth flow
 */
export function prepareBrowserForOAuth(): { success: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check popup blocker
  if (checkPopupBlocked()) {
    issues.push('Popup blocker is enabled. Please disable it for this site.');
  }
  
  // Check HTTPS
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    issues.push('OAuth requires HTTPS connection.');
  }
  
  // Check cookies
  if (!navigator.cookieEnabled) {
    issues.push('Cookies are disabled. Please enable cookies for OAuth to work.');
  }
  
  // Check localStorage
  try {
    localStorage.setItem('oauth-test', 'test');
    localStorage.removeItem('oauth-test');
  } catch {
    issues.push('Local storage is disabled. Please enable it for OAuth to work.');
  }
  
  return {
    success: issues.length === 0,
    issues
  };
}

/**
 * Enhanced error handling for social login
 */
export function handleSocialLoginError(error: any): { 
  userMessage: string; 
  technicalDetails: string;
  suggestedActions: string[];
} {
  const errorMessage = error?.message || error?.toString() || 'Unknown error';
  
  // Common error patterns and their solutions
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return {
      userMessage: 'The login process took too long. This usually happens when the popup is blocked or the OAuth service is slow.',
      technicalDetails: errorMessage,
      suggestedActions: [
        'Disable popup blocker for this site',
        'Try again with a stable internet connection',
        'Clear browser cache and cookies',
        'Try using incognito/private mode',
        'Check if your network blocks OAuth services'
      ]
    };
  }
  
  if (errorMessage.includes('popup') || errorMessage.includes('blocked')) {
    return {
      userMessage: 'The login popup was blocked by your browser.',
      technicalDetails: errorMessage,
      suggestedActions: [
        'Disable popup blocker for this site',
        'Allow popups in browser settings',
        'Try clicking the login button again'
      ]
    };
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return {
      userMessage: 'Network connection issue prevented login.',
      technicalDetails: errorMessage,
      suggestedActions: [
        'Check your internet connection',
        'Try again in a few moments',
        'Disable VPN if using one',
        'Check if your firewall blocks OAuth services'
      ]
    };
  }
  
  if (errorMessage.includes('cors') || errorMessage.includes('origin')) {
    return {
      userMessage: 'Cross-origin request blocked. This is a configuration issue.',
      technicalDetails: errorMessage,
      suggestedActions: [
        'Contact support - this is a server configuration issue',
        'Try using a different browser',
        'Clear browser cache and try again'
      ]
    };
  }
  
  // Generic error handling
  return {
    userMessage: 'An unexpected error occurred during login.',
    technicalDetails: errorMessage,
    suggestedActions: [
      'Try again in a few moments',
      'Clear browser cache and cookies',
      'Try using incognito/private mode',
      'Try a different browser',
      'Contact support if the issue persists'
    ]
  };
}

/**
 * Monitor OAuth popup and provide feedback
 */
export function monitorOAuthPopup(
  onProgress: (status: string) => void,
  onError: (error: string) => void,
  timeout: number = 30000
): () => void {
  let timeoutId: NodeJS.Timeout;
  let intervalId: NodeJS.Timeout;
  let startTime = Date.now();
  
  onProgress('Preparing OAuth flow...');
  
  // Check browser readiness
  const browserCheck = prepareBrowserForOAuth();
  if (!browserCheck.success) {
    onError(`Browser not ready: ${browserCheck.issues.join(', ')}`);
    return () => {};
  }
  
  onProgress('Browser ready, waiting for popup...');
  
  // Set timeout
  timeoutId = setTimeout(() => {
    onError(`OAuth flow timed out after ${timeout / 1000} seconds`);
  }, timeout);
  
  // Monitor progress
  intervalId = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, timeout - elapsed);
    onProgress(`OAuth in progress... ${Math.ceil(remaining / 1000)}s remaining`);
  }, 1000);
  
  // Cleanup function
  return () => {
    if (timeoutId) clearTimeout(timeoutId);
    if (intervalId) clearInterval(intervalId);
  };
}

/**
 * Retry mechanism for failed OAuth attempts
 */
export async function retryOAuthWithBackoff(
  oauthFunction: () => Promise<any>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await oauthFunction();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
      console.log(`OAuth attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
