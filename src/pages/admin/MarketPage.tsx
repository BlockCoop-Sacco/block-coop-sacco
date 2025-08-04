import React from 'react';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ExternalLink, TrendingUp, Info } from 'lucide-react';
import { appKitConfig, getPancakeSwapUrl } from '../../lib/appkit';

export function MarketPage() {
  const pancakeSwapUrl = getPancakeSwapUrl('swap', appKitConfig.contracts.share, appKitConfig.contracts.usdt);
  const poolUrl = getPancakeSwapUrl('add', appKitConfig.contracts.share, appKitConfig.contracts.usdt);
  const analyticsUrl = getPancakeSwapUrl('info/pools', undefined, undefined, appKitConfig.contracts.lp);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Secondary Market</h2>
        <p className="text-gray-600">Manage and monitor secondary market integration with PancakeSwap.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trading Interface */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-primary-600" />
                Trading Interface
              </h3>
              <Badge variant="success">Live</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 text-sm">
              Direct integration with PancakeSwap for SHARE/USDT trading pair.
            </p>
            
            <div className="space-y-3">
              <a
                href={pancakeSwapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button className="w-full justify-between">
                  <span>Open PancakeSwap</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
              
              <a
                href={poolUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button variant="outline" className="w-full justify-between">
                  <span>Add Liquidity</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Pool Analytics */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Info className="h-5 w-5 mr-2 text-accent-600" />
              Pool Information
            </h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Trading Pair:</span>
                <span className="font-medium">SHARE/USDT</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Pool Address:</span>
                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                  {appKitConfig.contracts.lp.slice(0, 8)}...{appKitConfig.contracts.lp.slice(-6)}
                </span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">DEX:</span>
                <span className="font-medium">PancakeSwap V2</span>
              </div>
            </div>

            <div className="pt-4 border-t">
              <a
                href={analyticsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button variant="outline" className="w-full justify-between">
                  <span>View Analytics</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contract Addresses */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Contract Addresses</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">SHARE Token</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                  <code className="text-sm text-gray-900 break-all">{appKitConfig.contracts.share}</code>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">USDT Token</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                  <code className="text-sm text-gray-900 break-all">{appKitConfig.contracts.usdt}</code>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">LP Token</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                  <code className="text-sm text-gray-900 break-all">{appKitConfig.contracts.lp}</code>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">PancakeSwap Router</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                  <code className="text-sm text-gray-900 break-all">{appKitConfig.contracts.router}</code>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}