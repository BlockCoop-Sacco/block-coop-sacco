import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { TrendingUp, Settings, AlertTriangle, Menu, X } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { NetworkIndicator, MobileNetworkIndicator } from '../ui/NetworkStatus';
import { validateAppKitConfig, isValidProjectId, appKitConfig } from '../../lib/appkit';
import { useWeb3 } from '../../providers/Web3Provider';
import { shouldShowAdminFeatures } from '../../lib/adminConfig';
import { BlockCoopLogo } from '../ui/BlockCoopLogo';

export function Header() {
  const web3Context = useWeb3();
  const { isConnected, connectWallet, account, provider, signer, error, isInitializing, isCorrectNetwork } = web3Context;
  const location = useLocation();
  const configErrors = validateAppKitConfig();
  const hasValidProjectId = isValidProjectId(appKitConfig.walletConnectProjectId);

  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Debug logging for Header component (only when state changes)
  useEffect(() => {
    console.log('Header: Web3 state changed:', {
      isConnected,
      account: account ? `${account.slice(0, 6)}...${account.slice(-4)}` : null,
      hasValidProjectId,
      hasProvider: !!provider,
      hasSigner: !!signer,
      error,
      isInitializing,
      timestamp: new Date().toISOString()
    });
  }, [isConnected, account, hasValidProjectId, provider, signer, error, isInitializing]);

  const isActive = (path: string) => location.pathname === path;
  const isAdminActive = location.pathname.startsWith('/admin');

  // Check if admin features should be shown for the current user
  const showAdminFeatures = shouldShowAdminFeatures(account, isConnected);

  // Close mobile menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when mobile menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle mobile menu toggle
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Handle mobile menu link click
  const handleMobileLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <BlockCoopLogo size="md" showFallback={true} />
            <span className="text-xl font-bold text-gray-900 hidden sm:block">BlockCoop Sacco</span>
            <span className="text-lg font-bold text-gray-900 sm:hidden">BlockCoop</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors ${
                isActive('/') 
                  ? 'text-primary-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Packages
            </Link>
            <Link
              to="/portfolio"
              className={`text-sm font-medium transition-colors ${
                isActive('/portfolio')
                  ? 'text-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Portfolio
            </Link>
            <Link
              to="/referral"
              className={`text-sm font-medium transition-colors ${
                isActive('/referral')
                  ? 'text-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Referrals
            </Link>
            <Link
              to="/trading"
              className={`text-sm font-medium transition-colors ${
                isActive('/trading')
                  ? 'text-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Trading
            </Link>
            <Link
              to="/redeem"
              className={`text-sm font-medium transition-colors ${
                isActive('/redeem')
                  ? 'text-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Redeem
            </Link>

            {/* Admin link - only visible to authorized admin wallets */}
            {showAdminFeatures && (
              <Link
                to="/admin"
                className={`flex items-center space-x-1 text-sm font-medium transition-colors ${
                  isAdminActive
                    ? 'text-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Settings className="h-4 w-4" />
                <span>Admin</span>
              </Link>
            )}
          </nav>

          {/* Mobile controls */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Mobile wallet button */}
            {hasValidProjectId ? (
              <button
                onClick={() => connectWallet()}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors min-h-[44px] ${
                  isConnected
                    ? (isCorrectNetwork
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-yellow-600 hover:bg-yellow-700 text-white')
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isConnected
                  ? (isCorrectNetwork ? 'Connected' : 'Wrong Network')
                  : 'Connect'
                }
              </button>
            ) : null}

            {/* Mobile network indicator - only show when connected */}
            {isConnected && <MobileNetworkIndicator />}

            {/* Mobile menu button */}
            <button
              onClick={toggleMobileMenu}
              className="p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={isMobileMenuOpen ? 'Close mobile menu' : 'Open mobile menu'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-gray-600" />
              ) : (
                <Menu className="h-6 w-6 text-gray-600" />
              )}
            </button>
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Configuration Warning */}
            {configErrors.length > 0 && (
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-warning-500" />
                <Badge variant="warning" className="text-xs">
                  Config Issues
                </Badge>
              </div>
            )}

            {/* Connection Status and Network Indicator */}
            <div className="flex items-center space-x-4">
              {/* Network Status */}
              <NetworkIndicator />

              {/* Web3 Button - only show if we have a valid project ID */}
              {hasValidProjectId ? (
                <button
                  onClick={() => connectWallet()}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                    isConnected
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isConnected ? (
                    <>
                      <span className="hidden lg:inline">
                        Connected{account ? ` (${account.slice(0, 6)}...${account.slice(-4)})` : ''}
                      </span>
                      <span className="lg:hidden">Connected</span>
                    </>
                  ) : (
                    'Connect Wallet'
                  )}
                </button>
              ) : (
                <div className="px-4 py-3 bg-gray-100 text-gray-500 rounded-lg text-sm min-h-[44px] flex items-center">
                  Wallet Unavailable
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="md:hidden fixed inset-0 z-50 bg-white"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
        >
          {/* Mobile menu header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <Link
              to="/"
              className="flex items-center space-x-2"
              onClick={handleMobileLinkClick}
            >
              <BlockCoopLogo size="md" showFallback={true} />
              <span className="text-lg font-bold text-gray-900">BlockCoop</span>
            </Link>
            <button
              onClick={toggleMobileMenu}
              className="p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close mobile menu"
            >
              <X className="h-6 w-6 text-gray-600" />
            </button>
          </div>

          {/* Mobile menu content */}
          <div className="px-4 py-6 space-y-6">
            {/* Navigation Links */}
            <nav className="space-y-4">
              <Link
                to="/"
                onClick={handleMobileLinkClick}
                className={`px-4 py-3 rounded-lg text-base font-medium transition-colors min-h-[44px] flex items-center ${
                  isActive('/')
                    ? 'bg-primary-100 text-primary-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                Packages
              </Link>
              <Link
                to="/portfolio"
                onClick={handleMobileLinkClick}
                className={`px-4 py-3 rounded-lg text-base font-medium transition-colors min-h-[44px] flex items-center ${
                  isActive('/portfolio')
                    ? 'bg-primary-100 text-primary-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                Portfolio
              </Link>
              <Link
                to="/referral"
                onClick={handleMobileLinkClick}
                className={`px-4 py-3 rounded-lg text-base font-medium transition-colors min-h-[44px] flex items-center ${
                  isActive('/referral')
                    ? 'bg-primary-100 text-primary-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                Referrals
              </Link>
              <Link
                to="/trading"
                onClick={handleMobileLinkClick}
                className={`px-4 py-3 rounded-lg text-base font-medium transition-colors min-h-[44px] flex items-center ${
                  isActive('/trading')
                    ? 'bg-primary-100 text-primary-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                Trading
              </Link>
              <Link
                to="/redeem"
                onClick={handleMobileLinkClick}
                className={`px-4 py-3 rounded-lg text-base font-medium transition-colors min-h-[44px] flex items-center ${
                  isActive('/redeem')
                    ? 'bg-primary-100 text-primary-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                Redeem
              </Link>

              {/* Admin link - only visible to authorized admin wallets */}
              {showAdminFeatures && (
                <Link
                  to="/admin"
                  onClick={handleMobileLinkClick}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-base font-medium transition-colors min-h-[44px] ${
                    isAdminActive
                      ? 'bg-primary-100 text-primary-600'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Settings className="h-5 w-5" />
                  <span>Admin</span>
                </Link>
              )}
            </nav>

            {/* Mobile wallet section */}
            <div className="border-t border-gray-200 pt-6">
              <div className="space-y-4">
                {/* Network Status */}
                <div className="px-4">
                  <NetworkIndicator />
                </div>

                {/* Configuration Warning */}
                {configErrors.length > 0 && (
                  <div className="px-4">
                    <div className="flex items-center space-x-2 p-3 bg-warning-50 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-warning-500" />
                      <Badge variant="warning" className="text-xs">
                        Config Issues
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Wallet Connection */}
                {hasValidProjectId ? (
                  <div className="px-4">
                    <button
                      onClick={() => {
                        connectWallet();
                        handleMobileLinkClick();
                      }}
                      className={`w-full px-4 py-3 rounded-lg text-base font-medium transition-colors min-h-[44px] ${
                        isConnected
                          ? (isCorrectNetwork
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-yellow-600 hover:bg-yellow-700 text-white')
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {isConnected ? (
                        <div className="text-center">
                          <div>{isCorrectNetwork ? 'Connected' : 'Wrong Network'}</div>
                          {account && (
                            <div className="text-sm opacity-90">
                              {account.slice(0, 6)}...{account.slice(-4)}
                            </div>
                          )}
                        </div>
                      ) : (
                        'Connect Wallet'
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="px-4">
                    <div className="w-full px-4 py-3 bg-gray-100 text-gray-500 rounded-lg text-base text-center min-h-[44px] flex items-center justify-center">
                      Wallet Unavailable
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Warning Banner */}
      {configErrors.length > 0 && (
        <div className="bg-warning-50 border-b border-warning-200 px-4 py-2">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-warning-600" />
              <span className="text-sm text-warning-800">
                Configuration issues detected. Some features may not work properly.
              </span>
              <button 
                className="text-xs text-warning-600 underline ml-2"
                onClick={() => {
                  console.log('Configuration Errors:', configErrors);
                  alert('Check the browser console for detailed configuration errors.');
                }}
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}