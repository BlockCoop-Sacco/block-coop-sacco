import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'cta-outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
          {
            'bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500': variant === 'primary',
            'bg-gray-100 hover:bg-gray-200 text-gray-900 focus:ring-gray-500': variant === 'secondary',
            'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 focus:ring-primary-500': variant === 'outline',
            'hover:bg-gray-100 text-gray-700 focus:ring-gray-500': variant === 'ghost',
            'bg-error-600 hover:bg-error-700 text-white focus:ring-error-500': variant === 'danger',
            'bg-white/20 backdrop-blur-sm border-2 border-white text-white hover:bg-white hover:text-blue-600 focus:ring-white/50 font-semibold shadow-lg hover:shadow-xl transition-all duration-300': variant === 'cta-outline',
          },
          {
            'px-4 py-3 text-sm min-h-[44px]': size === 'sm',
            'px-6 py-3 text-sm min-h-[44px]': size === 'md',
            'px-8 py-4 text-base min-h-[48px]': size === 'lg',
          },
          (disabled || loading) && 'opacity-50 cursor-not-allowed',
          className
        )}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };