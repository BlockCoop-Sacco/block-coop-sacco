import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Copy, Share2, Link, QrCode, ExternalLink, Check } from 'lucide-react';
import {
  generateReferralLink,
  copyReferralLink,
  copyReferralCode,
  shareReferralLink,
  generateReferralSummaryText,
  copyToClipboardWithFeedback,
  validateReferralLink,
  ReferralLinkData
} from '../../lib/referral';
import { formatBLOCKS } from '../../lib/utils';
import toast from 'react-hot-toast';

interface ReferralLinkCardProps {
  userAddress: string;
  totalRewards: bigint;
  referralCount: number;
}

export function ReferralLinkCard({ userAddress, totalRewards, referralCount }: ReferralLinkCardProps) {
  const [referralLink, setReferralLink] = useState<ReferralLinkData | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (userAddress) {
      const link = generateReferralLink(userAddress);
      if (link && validateReferralLink(link)) {
        setReferralLink(link);
      } else {
        console.error('Failed to generate valid referral link for:', userAddress);
        toast.error('Failed to generate referral link');
      }
    }
  }, [userAddress]);

  const handleCopyLink = async () => {
    if (!referralLink) return;
    
    const success = await copyReferralLink(referralLink);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyCode = async () => {
    if (!referralLink) return;
    
    const success = await copyReferralCode(referralLink.code);
    if (success) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleShare = async () => {
    if (!referralLink) return;
    
    setSharing(true);
    try {
      await shareReferralLink(referralLink);
    } catch (error) {
      console.error('Share failed:', error);
    } finally {
      setSharing(false);
    }
  };

  const handleShareStats = async () => {
    if (!referralLink) return;

    const summaryText = generateReferralSummaryText(
      formatBLOCKS(totalRewards),
      referralCount,
      referralLink
    );

    await copyToClipboardWithFeedback(
      summaryText,
      'Referral stats copied to clipboard!',
      'Failed to copy referral stats'
    );
  };

  if (!referralLink) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Referral Link</h3>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Your Referral Link</h3>
          <Badge variant="outline" className="flex items-center">
            <Link className="h-3 w-3 mr-1" />
            Code: {referralLink.code}
          </Badge>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Share your unique referral link to earn rewards when others join BlockCoop
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Referral Link Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Referral Link
          </label>
          <div className="flex gap-2">
            <Input
              value={referralLink.url}
              readOnly
              className="flex-1 font-mono text-sm"
              onClick={(e) => e.currentTarget.select()}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="flex items-center gap-1"
            >
              {copiedLink ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copiedLink ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>

        {/* Referral Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Referral Code
          </label>
          <div className="flex gap-2">
            <Input
              value={referralLink.code}
              readOnly
              className="flex-1 font-mono text-lg font-bold text-center"
              onClick={(e) => e.currentTarget.select()}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              className="flex items-center gap-1"
            >
              {copiedCode ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copiedCode ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-gray-200">
          <Button
            onClick={handleShare}
            disabled={sharing}
            className="flex items-center justify-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            {sharing ? 'Sharing...' : 'Share Link'}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleShareStats}
            className="flex items-center justify-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Share Stats
          </Button>
        </div>

        {/* Referral Benefits */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-blue-700 mb-2">Referral Benefits</h4>
          <div className="space-y-1 text-sm text-blue-600">
            <p>• Earn 2.5% - 5% BLOCKS rewards for each referral</p>
            <p>• Rewards are paid instantly from treasury</p>
            <p>• No limit on the number of referrals</p>
            <p>• Help grow the BlockCoop community</p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-green-700 mb-2">How It Works</h4>
          <div className="space-y-1 text-sm text-green-600">
            <p>1. Share your referral link with friends</p>
            <p>2. They visit BlockCoop using your link</p>
            <p>3. When they purchase a package, you earn rewards</p>
            <p>4. Rewards are automatically sent to your wallet</p>
          </div>
        </div>

        {/* QR Code Placeholder */}
        <div className="text-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700"
            onClick={() => toast.info('QR Code feature coming soon!')}
          >
            <QrCode className="h-4 w-4 mr-1" />
            Generate QR Code
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
