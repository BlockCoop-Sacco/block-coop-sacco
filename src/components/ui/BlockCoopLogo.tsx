import { useState } from 'react';
import { Building2 } from 'lucide-react';

interface BlockCoopLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showFallback?: boolean;
}

export function BlockCoopLogo({ 
  className = "", 
  size = 'md',
  showFallback = true 
}: BlockCoopLogoProps) {
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

  if (imageError && showFallback) {
    // Fallback to Building2 icon if image fails to load
    return (
      <div className={`bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center ${sizeClass} ${className}`}>
        <Building2 className={`${iconSize} text-white`} />
      </div>
    );
  }

  if (imageError && !showFallback) {
    return null;
  }

  return (
    <img
      src="/Blockcooplogo.png"
      alt="BlockCoop Sacco Logo"
      className={`${sizeClass} object-contain rounded-lg shadow-sm ${className}`}
      onError={() => setImageError(true)}
      onLoad={() => setImageError(false)}
    />
  );
}
