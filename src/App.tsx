import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Web3Provider } from './providers/Web3Provider';
import { RefreshProvider } from './contexts/RefreshContext';
import { Layout } from './components/layout/Layout';
import { AdminLayout } from './pages/admin/AdminLayout';
import { HomePage } from './pages/HomePage';
import { RedeemPage } from './pages/RedeemPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { ReferralPage } from './pages/ReferralPage';
import { TradingPage } from './pages/TradingPage';
import { PackagesPage } from './pages/admin/PackagesPage';
import { TaxesPage } from './pages/admin/TaxesPage';
import { MarketPage } from './pages/admin/MarketPage';
import { SocialLoginDebug } from './components/debug/SocialLoginDebug';

// Import and initialize AppKit before any React components
import { appKit } from './lib/appkit';

// Import contract test for development (commented out to prevent loading issues)
// import './test/contractTest';

// Ensure AppKit is initialized
if (!appKit) {
  throw new Error('AppKit failed to initialize. Check configuration and console for errors.');
}


function App() {
  return (
    <Web3Provider>
      <RefreshProvider>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/redeem" element={<RedeemPage />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
              <Route path="/referral" element={<ReferralPage />} />
              <Route path="/trading" element={<TradingPage />} />

              <Route path="/admin" element={
                <AdminLayout>
                  <PackagesPage />
                </AdminLayout>
              } />
              <Route path="/admin/packages" element={
                <AdminLayout>
                  <PackagesPage />
                </AdminLayout>
              } />
              <Route path="/admin/taxes" element={
                <AdminLayout>
                  <TaxesPage />
                </AdminLayout>
              } />
              <Route path="/admin/market" element={
                <AdminLayout>
                  <MarketPage />
                </AdminLayout>
              } />
            </Routes>
          </Layout>
          {/* Debug component temporarily disabled due to AppKit initialization race condition */}
          {/* {import.meta.env.DEV && <SocialLoginDebug />} */}
        </Router>
      </RefreshProvider>
    </Web3Provider>
  );
}

export default App;