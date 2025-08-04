
import { PackageList } from '../components/packages/PackageList';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BlocksTokenLogo } from '../components/ui/BlocksTokenLogo';
import {
  Shield,
  Zap,
  Package,
  ArrowRight,
  Users,
  Target,
  CheckCircle,
  Lock,
  BarChart3,
  Coins,
  Globe,
  Award,
  Handshake,
  TrendingUp,
  DollarSign,
  BookOpen,
  PiggyBank,
  UserPlus,
  Banknote,
  Building2,
  Twitter,
  MessageCircle,
  Send,
  Instagram,
  Facebook
} from 'lucide-react';

export function HomePage() {
  const scrollToPackages = () => {
    const packagesSection = document.getElementById('packages-section');
    if (packagesSection) {
      packagesSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToHowItWorks = () => {
    const howItWorksSection = document.getElementById('how-it-works-section');
    if (howItWorksSection) {
      howItWorksSection.scrollIntoView({ behavior: 'smooth' });
    }
  };



  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-blue-50 via-purple-50 to-teal-50 rounded-3xl p-8 md:p-16 text-center space-y-8">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-3xl"></div>
        <div className="relative space-y-6">
          {/* BLOCKS Token Logo */}
          <div className="flex justify-center mb-6">
            <BlocksTokenLogo size="xl" animated={true} className="hover:scale-110 transition-transform duration-300" />
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
            $BLOCKS Token: The Future of
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent block">
              Financial Freedom is Here
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Your 100x Investment Backed by the #1 Blockchain SACCO in Africa
            
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
          <div className="flex items-center space-x-2 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full">
            <Zap className="h-5 w-5 text-blue-600" />
            <span>Daily Yields</span>
          </div>
          <div className="flex items-center space-x-2 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full">
            <DollarSign className="h-5 w-5 text-green-600" />
            <span>Annual Dividends</span>
          </div>
          <div className="flex items-center space-x-2 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            <span>100x Potential</span>
          </div>
          <div className="flex items-center space-x-2 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full">
            <Building2 className="h-5 w-5 text-orange-600" />
            <span>Real-World Assets</span>
          </div>
          <div className="flex items-center space-x-2 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full">
            <Users className="h-5 w-5 text-teal-600" />
            <span>Community Impact</span>
          </div>
        </div>

        {/* Dual CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
          <Button
            size="lg"
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 font-semibold focus:ring-4 focus:ring-blue-300"
            onClick={scrollToPackages}
            aria-label="Start investing in BlockCoop packages today"
          >
            🚀 Buy $BLOCKS Now
            <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="px-8 py-4 bg-white/90 backdrop-blur-sm border-2 border-blue-600 text-blue-700 hover:bg-blue-600 hover:text-white shadow-lg hover:shadow-xl transition-all duration-300 font-semibold focus:ring-4 focus:ring-blue-300"
            onClick={() => window.open('https://pancakeswap.finance', '_blank')}
            aria-label="Trade BLOCKS on PancakeSwap"
          >
            🥞 Trade on PancakeSwap
          </Button>
        </div>
      </div>

      {/* The Mission Section */}
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 rounded-3xl p-8 md:p-12 space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            🎯 The Mission
          </h2>
          <p className="text-lg text-gray-600 max-w-4xl mx-auto leading-relaxed">
            BlockCoop SACCO is building a financial revolution in Africa and other emerging markets. Our goal is simple but powerful:
            <span className="block mt-4 font-semibold text-gray-800">
              Use blockchain technology and digital assets to create financial freedom and wealth for the underserved
            </span>
          </p>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            We invest in high-yielding real-world assets giving you stable returns and sustainable impact
          </p>
        </div>
      </div>

      {/* Why Buy $BLOCKS Token Section */}
      <div className="space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            🚀 Why Buy $BLOCKS Token?
          </h2>
          <p className="text-lg text-gray-600 max-w-4xl mx-auto leading-relaxed">
            When you hold $BLOCKS, you don't just own a token.
            <span className="block mt-2 font-semibold text-gray-800">
              You own a share of Africa's first blockchain-powered SACCO.
            </span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="text-center group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6 space-y-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">✅ Daily Yields</h3>
              <p className="text-gray-600 text-sm">
                Earn daily returns through staking fees and transaction taxes from the BLOCKS ecosystem
              </p>
            </CardContent>
          </Card>

          <Card className="text-center group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6 space-y-4">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">✅ Annual Dividends</h3>
              <p className="text-gray-600 text-sm">
                Enjoy share-like dividends as BlockCoop SACCO grows and profits from its asset base
              </p>
            </CardContent>
          </Card>

          <Card className="text-center group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6 space-y-4">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">✅ 100x Potential</h3>
              <p className="text-gray-600 text-sm">
                As adoption grows across Africa, your early entry can deliver massive capital gains
              </p>
            </CardContent>
          </Card>

          <Card className="text-center group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-6 space-y-4">
              <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                <Package className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">✅ Liquidity Options</h3>
              <p className="text-gray-600 text-sm">
                Trade on PancakeSwap or exit through our liquidity packages with flexible option.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-teal-50 to-teal-100">
            <CardContent className="p-6 space-y-4">
              <div className="w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">✅ Real World Backing</h3>
              <p className="text-gray-600 text-sm">
                Funds invested in assets that matter housing, trade, digital infrastructure, and productive credit
              </p>
            </CardContent>
          </Card>

          <Card className="text-center group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-indigo-50 to-indigo-100">
            <CardContent className="p-6 space-y-4">
              <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">✅ Community Empowerment</h3>
              <p className="text-gray-600 text-sm">
                Every purchase supports financial inclusion across Africa and emerging markets
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Two Ways to Buy $BLOCKS Section */}
      <div className="space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            🛒 Two Ways to Buy $BLOCKS
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Choose the method that best fits your investment strategy and trading preferences
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Method 1: Token Packages */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-blue-50 to-purple-50">
            <CardContent className="p-8 space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                  <Package className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mt-4">🛒️ 1. Buy Token Packages</h3>
                <p className="text-gray-600 mt-2">Purchase directly from our treasury and get:</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Best price per token</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Daily liquidity taxes</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Eligibility for annual dividend pool</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Up to 15% discount on packages more than $1000</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">No trading fees</span>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-green-800 text-sm font-medium">
                  ✅ Great for long-term holders and impact investors
                </p>
              </div>

              <Button
                size="lg"
                className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
                onClick={scrollToPackages}
              >
                🛒 Buy Packages Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>

          {/* Method 2: PancakeSwap */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-orange-50 to-yellow-50">
            <CardContent className="p-8 space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-600 to-yellow-600 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mt-4">🥞 2. Buy from PancakeSwap (DEX)</h3>
                <p className="text-gray-600 mt-2">Prefer flexible trading and fast exit? Use PancakeSwap:</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-orange-600 flex-shrink-0" />
                  <span className="text-gray-700">Daily staking taxes earn you rewards</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-orange-600 flex-shrink-0" />
                  <span className="text-gray-700">Open-market pricing</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-orange-600 flex-shrink-0" />
                  <span className="text-gray-700">Instant liquidity</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-orange-600 flex-shrink-0" />
                  <span className="text-gray-700">24/7 trading availability</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-orange-600 flex-shrink-0" />
                  <span className="text-gray-700">Ideal for active traders</span>
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-orange-800 text-sm font-medium">
                  🥞 Perfect for traders who want immediate market access.
                </p>
              </div>

              <Button
                size="lg"
                variant="outline"
                className="w-full px-8 py-4 bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
                onClick={() => window.open('https://pancakeswap.finance', '_blank')}
              >
                🥞 Trade on PancakeSwap
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Packages Section */}
      <div id="packages-section" className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Investment Packages</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose from our carefully crafted investment packages, each designed with unique split ratios and vesting schedules
          </p>
        </div>

        <PackageList />
      </div>

      {/* How It Works Section */}
      <div id="how-it-works-section" className="space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            How It Works
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Simple, transparent, and automated - get started in three easy steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <Package className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">1</span>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-gray-900">Purchase Investment Package</h3>
              <p className="text-gray-600">
                Select and purchase an investment package using USDT. Each package is designed with specific
                token distribution ratios and dividend earning potential.
              </p>
            </div>
          </div>

          <div className="text-center space-y-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-teal-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <Coins className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">2</span>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-gray-900">Receive BLOCKS Tokens</h3>
              <p className="text-gray-600">
                Automatically receive BLOCKS tokens distributed through vesting schedules and liquidity pools.
                Your tokens immediately start earning dividend eligibility.
              </p>
            </div>
          </div>

          <div className="text-center space-y-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-teal-600 to-green-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <DollarSign className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">3</span>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-gray-900">Earn Annual Dividends</h3>
              <p className="text-gray-600">
                Receive annual dividend payments based on your BLOCKS token holdings. Trade tokens on secondary
                markets while maintaining dividend eligibility.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits of Holding $BLOCKS Section */}
      <div id="benefits-section" className="space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Benefits of Holding $BLOCKS
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Unlock multiple benefits and opportunities with your BLOCKS token holdings
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Row 1 */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Ownership Rights</h3>
              <p className="text-gray-600 text-sm">
                Hold ownership stakes in the SACCO with voting rights on key decisions and governance proposals
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Annual Dividends</h3>
              <p className="text-gray-600 text-sm">
                Receive proportional dividend payments from SACCO profits distributed annually to token holders
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Lock className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Staking Rewards</h3>
              <p className="text-gray-600 text-sm">
                Stake your BLOCKS tokens to earn additional rewards and participate in enhanced dividend pools.
              </p>
            </CardContent>
          </Card>

          {/* Row 2 */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Trading Opportunities</h3>
              <p className="text-gray-600 text-sm">
                Trade BLOCKS tokens on secondary markets for immediate liquidity while maintaining dividend eligibility
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-teal-50 to-teal-100">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 bg-teal-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Banknote className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Loan Collateral</h3>
              <p className="text-gray-600 text-sm">
                Use BLOCKS tokens as collateral for loans within the SACCO ecosystem at preferential rates.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-indigo-50 to-indigo-100">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Financial Education</h3>
              <p className="text-gray-600 text-sm">
                Access exclusive educational resources, workshops, and financial literacy programs for token holders
              </p>
            </CardContent>
          </Card>

          {/* Row 3 */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-pink-50 to-pink-100">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 bg-pink-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Global Access</h3>
              <p className="text-gray-600 text-sm">
                Access your investments and dividends from anywhere in the world with blockchain transparency
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-yellow-50 to-yellow-100">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <PiggyBank className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Retirement Planning</h3>
              <p className="text-gray-600 text-sm">
                Build long-term wealth through vesting schedules and compound dividend growth for retirement security.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <UserPlus className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Referral Rewards</h3>
              <p className="text-gray-600 text-sm">
                Earn additional BLOCKS tokens by referring new members to the SACCO community and ecosystem
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Perfect for Every Investor Section */}
      <div className="space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Perfect for Every Investor
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Whether you're new to DeFi or a seasoned investor, BlockCoop has something for you
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-blue-50 to-purple-50">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                <Target className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-gray-900">DeFi Enthusiasts</h3>
                <p className="text-gray-600">
                  Explore advanced token distribution mechanisms, automated dividend systems, and yield optimization
                  strategies in a secure, audited environment with transparent smart contracts
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  Advanced Features
                </span>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  High Yields
                </span>
                <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-medium">
                  Smart Contracts
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-green-50 to-teal-50">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-teal-600 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                <Handshake className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-gray-900">Traditional Investors</h3>
                <p className="text-gray-600">
                  Experience familiar SACCO investment principles enhanced with blockchain transparency,
                  security, and global accessibility. Earn dividends like traditional investments.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  Familiar Concepts
                </span>
                <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-medium">
                  Enhanced Security
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  Annual Dividends
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-orange-50 to-yellow-50">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-yellow-600 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-gray-900">SACCO Members</h3>
                <p className="text-gray-600">
                  Modernize your cooperative investments with blockchain technology while maintaining
                  the community-driven values, mutual support, and shared prosperity you know and trust.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                  Community Focus
                </span>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                  Modern Tools
                </span>
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                  Shared Prosperity
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Second CTA Section */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-green-600 rounded-3xl p-8 md:p-12 text-center text-white">
        <div className="space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to Start Your Investment Journey?
          </h2>
          <p className="text-xl opacity-90 max-w-3xl mx-auto">
            Join thousands of investors who are already benefiting from blockchain-powered SACCO investments.
            Start with any package and experience the future of cooperative finance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="px-8 py-4 bg-white text-purple-950 hover:bg-purple-50 hover:text-purple-900 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold border-2 border-blue-400 focus:ring-4 focus:ring-white/50"
              onClick={scrollToPackages}
              aria-label="View all available investment packages"
            >
              View All Packages
              <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="px-8 py-4 bg-white/20 backdrop-blur-sm border-2 border-blue-400 text-white hover:bg-white hover:text-purple-600 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold focus:ring-4 focus:ring-white/50"
              onClick={scrollToHowItWorks}
              aria-label="Learn more about how BlockCoop works"
            >
              Learn More
            </Button>
          </div>
        </div>
      </div>

      {/* Trusted by the Community Section */}
      <div className="space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Trusted by the Community
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Built on proven technology with transparent operations and community-first principles
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="text-center space-y-4 border-0 bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mx-auto">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900">Smart Contract Audited</h4>
              <p className="text-gray-600 text-sm">Comprehensive security audit completed by blockchain experts</p>
            </CardContent>
          </Card>

          <Card className="text-center space-y-4 border-0 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto">
                <Lock className="h-6 w-6 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900">Secure Vesting</h4>
              <p className="text-gray-600 text-sm">Time-locked smart contracts protect your long-term investments</p>
            </CardContent>
          </Card>

          <Card className="text-center space-y-4 border-0 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mx-auto">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900">BSC Network</h4>
              <p className="text-gray-600 text-sm">Built on proven Binance Smart Chain infrastructure</p>
            </CardContent>
          </Card>

          <Card className="text-center space-y-4 border-0 bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mx-auto">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900">Transparent Operations</h4>
              <p className="text-gray-600 text-sm">All transactions visible and verifiable on blockchain</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Why Trade with BlockCoop Section */}
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-3xl p-8 md:p-12">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Why Trade with BlockCoop?
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Experience the advantages of blockchain-powered SACCO investments
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Row 1 */}
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Transparent & Secure</h3>
                <p className="text-gray-600 text-sm">
                  All transactions are recorded on the blockchain, ensuring complete transparency and security for your investments.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Global Accessibility</h3>
                <p className="text-gray-600 text-sm">
                  Access your investments 24/7 from anywhere in the world with just an internet connection and wallet.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Instant Settlements</h3>
                <p className="text-gray-600 text-sm">
                  No waiting for bank transfers or clearing houses - transactions settle instantly on the blockchain.
                </p>
              </div>
            </div>

            {/* Row 2 */}
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Flexible Investment Options</h3>
                <p className="text-gray-600 text-sm">
                  Choose from multiple packages with different risk profiles, vesting periods, and liquidity options.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Community-Driven</h3>
                <p className="text-gray-600 text-sm">
                  Built on SACCO principles of mutual cooperation and shared prosperity within a decentralized framework.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Award className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Proven Technology</h3>
                <p className="text-gray-600 text-sm">
                  Built on Binance Smart Chain with battle-tested smart contracts and comprehensive security audits.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Join the Movement Section */}
      <div className="bg-gradient-to-r from-green-600 via-teal-600 to-blue-600 rounded-3xl p-8 md:p-12 text-center text-white">
        <div className="space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">
            🚀 Join the Movement
          </h2>
          <div className="max-w-4xl mx-auto space-y-4">
            <p className="text-xl opacity-90">
              By owning $BLOCKS, you're investing in more than profits
              <span className="block font-semibold">you're investing in people, progress, and possibilities.</span>
            </p>
            <p className="text-lg opacity-80">
              Be among the pioneers shaping the future of African finance.
            </p>
            <p className="text-xl font-semibold">
              Empower a continent. Earn real returns. That's the $BLOCKS promise.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-white/20">
            <p className="text-sm opacity-75 mb-6">Connect with us on social media:</p>

            {/* Social Media Links */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <a
                href="https://x.com/BlockCoopSACCO"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-3 rounded-full hover:bg-white/30 transition-all duration-300"
              >
                <Twitter className="h-5 w-5" />
                <span className="text-sm font-medium">Twitter</span>
              </a>

              <a
                href="https://api.whatsapp.com/send?phone=254798087598"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-3 rounded-full hover:bg-white/30 transition-all duration-300"
              >
                <MessageCircle className="h-5 w-5" />
                <span className="text-sm font-medium">WhatsApp</span>
              </a>

              <a
                href="https://t.me/+4DC0cy18OLdmYmQ8"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-3 rounded-full hover:bg-white/30 transition-all duration-300"
              >
                <Send className="h-5 w-5" />
                <span className="text-sm font-medium">Telegram</span>
              </a>

              <a
                href="https://www.instagram.com/blockcoop_sacco/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-3 rounded-full hover:bg-white/30 transition-all duration-300"
              >
                <Instagram className="h-5 w-5" />
                <span className="text-sm font-medium">Instagram</span>
              </a>

              <a
                href="https://web.facebook.com/people/BlockCoop-SACCO/61572959396535/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-3 rounded-full hover:bg-white/30 transition-all duration-300"
              >
                <Facebook className="h-5 w-5" />
                <span className="text-sm font-medium">Facebook</span>
              </a>
            </div>

            {/* Platform Links */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center text-sm">
              
              <a
                href="https://play.google.com/store/apps/details?id=com.sortika"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full hover:bg-white/30 transition-all duration-300"
              >
                <Package className="h-4 w-4" />
                <span>📱 Download Sortika App</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Final Disclaimer */}
      <div className="border-t border-gray-200 pt-8">
        <div className="text-center text-gray-500 text-sm">
          <p>
            BlockCoop is a decentralized platform. Always do your own research and invest responsibly.
            Past performance does not guarantee future results.
          </p>
        </div>
      </div>

    </div>
  );
}