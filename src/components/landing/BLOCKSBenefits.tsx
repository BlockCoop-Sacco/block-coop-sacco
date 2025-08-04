import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import {
  Coins,
  TrendingUp,
  Shield,
  Zap,
  Users,
  BarChart3,
  Lock,
  ArrowUpRight,
  DollarSign,
  Target,
  Award,
  Handshake
} from 'lucide-react';

export function BLOCKSBenefits() {
  const benefits = [
    {
      icon: Coins,
      title: 'BLOCKS Token Rewards',
      description: 'Earn BLOCKS tokens through package purchases and staking rewards',
      color: 'bg-blue-100 text-blue-600',
      badge: 'Core Benefit'
    },
    {
      icon: TrendingUp,
      title: 'Secondary Market Trading',
      description: 'Trade BLOCKS tokens on our integrated secondary market with real-time pricing',
      color: 'bg-green-100 text-green-600',
      badge: 'Trading'
    },
    {
      icon: Lock,
      title: 'Flexible Staking Options',
      description: 'Choose from multiple staking pools with different lock periods and APY rates',
      color: 'bg-purple-100 text-purple-600',
      badge: 'Staking'
    },
    {
      icon: DollarSign,
      title: 'Dividend Distribution',
      description: 'Receive regular dividend payments from SACCO profits distributed to token holders',
      color: 'bg-yellow-100 text-yellow-600',
      badge: 'Dividends'
    },
    {
      icon: Shield,
      title: 'Vesting Protection',
      description: 'Secure vesting schedules protect your long-term investment growth',
      color: 'bg-red-100 text-red-600',
      badge: 'Security'
    },
    {
      icon: BarChart3,
      title: 'Portfolio Analytics',
      description: 'Track your investment performance with detailed analytics and reporting',
      color: 'bg-indigo-100 text-indigo-600',
      badge: 'Analytics'
    },
    {
      icon: Users,
      title: 'Community Governance',
      description: 'Participate in SACCO decision-making through token-based voting rights',
      color: 'bg-pink-100 text-pink-600',
      badge: 'Governance'
    },
    {
      icon: Zap,
      title: 'Instant Liquidity',
      description: 'Access immediate liquidity through our automated market maker system',
      color: 'bg-orange-100 text-orange-600',
      badge: 'Liquidity'
    }
  ];

  const keyFeatures = [
    {
      title: 'Dual Token System',
      description: 'BLOCKS tokens for trading and BLOCKS-LP tokens for liquidity provision',
      icon: Target
    },
    {
      title: 'Automated Splitting',
      description: '70% vesting, 30% liquidity pool allocation on every package purchase',
      icon: ArrowUpRight
    },
    {
      title: 'Dynamic Pricing',
      description: 'Market-driven pricing with target price mechanisms for stability',
      icon: BarChart3
    },
    {
      title: 'Referral Rewards',
      description: 'Earn additional BLOCKS tokens by referring new members to the SACCO',
      icon: Handshake
    }
  ];

  return (
    <div className="space-y-16">
      {/* Main Benefits Section */}
      <div className="text-center space-y-8">
        <div className="space-y-4">
          <Badge variant="outline" className="px-4 py-2 text-sm font-medium">
            BLOCKS Token Benefits
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Why Choose BLOCKS Tokens?
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            BLOCKS tokens are at the heart of our ecosystem, providing multiple benefits 
            and opportunities for growth, trading, and participation in the SACCO community.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => (
            <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-white to-gray-50">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-lg ${benefit.color}`}>
                    <benefit.icon className="h-6 w-6" />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {benefit.badge}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                    {benefit.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Key Features Section */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-2xl p-8 md:p-12">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900">
              Advanced Token Features
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our innovative token system provides sophisticated features designed 
              for modern SACCO operations and member benefits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {keyFeatures.map((feature, index) => (
              <div key={index} className="flex items-start space-x-4 text-left">
                <div className="p-3 bg-white rounded-lg shadow-sm">
                  <feature.icon className="h-6 w-6 text-primary-600" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-lg font-semibold text-gray-900">
                    {feature.title}
                  </h4>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Token Economics Section */}
      <div className="text-center space-y-8">
        <div className="space-y-4">
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900">
            Token Economics
          </h3>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Understanding how BLOCKS tokens work within our ecosystem
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="border-2 border-primary-100">
            <CardContent className="p-6 text-center space-y-4">
              <div className="p-4 bg-primary-100 rounded-full w-16 h-16 mx-auto">
                <Award className="h-8 w-8 text-primary-600 mx-auto mt-1" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900">
                Earn Tokens
              </h4>
              <p className="text-gray-600">
                Receive BLOCKS tokens through package purchases, staking rewards, 
                and referral bonuses
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-100">
            <CardContent className="p-6 text-center space-y-4">
              <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto">
                <TrendingUp className="h-8 w-8 text-green-600 mx-auto mt-1" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900">
                Trade Tokens
              </h4>
              <p className="text-gray-600">
                Trade BLOCKS tokens on our secondary market with competitive 
                pricing and low fees
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-100">
            <CardContent className="p-6 text-center space-y-4">
              <div className="p-4 bg-purple-100 rounded-full w-16 h-16 mx-auto">
                <Lock className="h-8 w-8 text-purple-600 mx-auto mt-1" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900">
                Stake Tokens
              </h4>
              <p className="text-gray-600">
                Stake your BLOCKS tokens in various pools to earn additional 
                rewards and dividends
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-primary-600 to-blue-600 rounded-2xl p-8 md:p-12 text-center text-white">
        <div className="space-y-6">
          <h3 className="text-2xl md:text-3xl font-bold">
            Ready to Start Earning BLOCKS Tokens?
          </h3>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            Join thousands of SACCO members who are already benefiting from our 
            innovative blockchain-powered investment platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => {
                const packagesSection = document.getElementById('packages-section');
                if (packagesSection) {
                  packagesSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="px-8 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              View Packages
            </button>
            <button 
              onClick={() => {
                window.location.href = '/trading';
              }}
              className="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-primary-600 transition-colors"
            >
              Start Trading
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
