import { useState } from 'react';
import { Coins } from 'lucide-react';

interface BlocksTokenLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showFallback?: boolean;
  animated?: boolean;
}

export function BlocksTokenLogo({
  className = "",
  size = 'md',
  showFallback = true,
  animated = false
}: BlocksTokenLogoProps) {
  const [imageError, setImageError] = useState(false);

  // Size mappings
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  const sizeClass = sizeClasses[size];
  const iconSize = iconSizes[size];

  // Animation classes - combining gentle floating and subtle pulse
  const animationClasses = animated
    ? 'animate-float motion-reduce:animate-pulse motion-reduce:duration-[3s]'
    : '';

  // Background that blends with hero section gradient
  const backgroundClasses = 'bg-gradient-to-br from-blue-100/80 via-purple-100/80 to-teal-100/80 backdrop-blur-sm';

  if (imageError && showFallback) {
    // Fallback to Coins icon if image fails to load
    return (
      <div className={`${backgroundClasses} rounded-full flex items-center justify-center ${sizeClass} ${animationClasses} ${className} shadow-lg border border-white/20`}>
        <Coins className={`${iconSize} text-purple-600`} />
      </div>
    );
  }

  if (imageError && !showFallback) {
    return null;
  }

  return (
    <div className={`${backgroundClasses} rounded-full p-2 ${sizeClass} ${animationClasses} ${className} shadow-lg border border-white/20 flex items-center justify-center`}>
      <img
        src="/assets/BlocksToken.png"
        alt="BLOCKS Token Logo"
        className="w-full h-full object-contain"
        onError={() => setImageError(true)}
        onLoad={() => setImageError(false)}
      />
    </div>
  );
}
