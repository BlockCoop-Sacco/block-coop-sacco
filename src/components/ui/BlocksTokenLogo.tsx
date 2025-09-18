import { useState } from 'react';
import { Coins, Sparkles } from 'lucide-react';

interface BlocksTokenLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'mega' | 'giant';
  showFallback?: boolean;
  animated?: boolean;
  sophisticated?: boolean;
}

export function BlocksTokenLogo({
  className = "",
  size = 'md',
  showFallback = true,
  animated = false,
  sophisticated = false
}: BlocksTokenLogoProps) {
  const [imageError, setImageError] = useState(false);

  // Size mappings
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
    xxl: 'w-32 h-32',
    mega: 'w-48 h-48',
    giant: 'w-64 h-64'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
    xxl: 'h-16 w-16',
    mega: 'h-24 w-24',
    giant: 'h-32 w-32'
  };

  const sizeClass = sizeClasses[size];
  const iconSize = iconSizes[size];

  // Sophisticated animation classes with multiple layers
  const sophisticatedAnimationClasses = sophisticated
    ? 'animate-float animate-pulse-glow animate-shimmer motion-reduce:animate-pulse motion-reduce:duration-[3s]'
    : '';

  // Basic animation classes
  const basicAnimationClasses = animated
    ? 'animate-float motion-reduce:animate-pulse motion-reduce:duration-[3s]'
    : '';

  const animationClasses = sophisticated ? sophisticatedAnimationClasses : basicAnimationClasses;

  // Enhanced background with gradient for sophisticated mode
  const backgroundClasses = sophisticated
    ? 'bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-teal-500/10 backdrop-blur-sm border-2 border-white/30'
    : 'bg-transparent backdrop-blur-sm border border-white/20';

  if (imageError && showFallback) {
    // Fallback to Coins icon if image fails to load
    return (
      <div className={`${backgroundClasses} rounded-full flex items-center justify-center ${sizeClass} ${animationClasses} ${className} shadow-lg`}>
        <Coins className={`${iconSize} text-purple-600`} />
      </div>
    );
  }

  if (imageError && !showFallback) {
    return null;
  }

  return (
    <div className="relative">
      {/* Orbital sparkles for sophisticated mode */}
      {sophisticated && (
        <>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-orbit opacity-60">
              <Sparkles className="w-2 h-2 text-blue-400 animate-sparkle" />
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-counter-orbit opacity-40">
              <Sparkles className="w-1.5 h-1.5 text-purple-400 animate-sparkle" />
            </div>
          </div>
        </>
      )}
      
      {/* Main logo container */}
      <div className={`${backgroundClasses} rounded-full p-2 ${sizeClass} ${animationClasses} ${className} shadow-lg flex items-center justify-center relative overflow-hidden`}>
        {/* Shimmer overlay for sophisticated mode */}
        {sophisticated && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer rounded-full" />
        )}
        
        <img
          src="/assets/BlocksToken.png"
          alt="BLOCKS Token Logo"
          className="w-full h-full object-contain relative z-10"
          onError={() => setImageError(true)}
          onLoad={() => setImageError(false)}
        />
      </div>
    </div>
  );
}
