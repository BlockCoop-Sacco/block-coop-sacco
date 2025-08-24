import React, { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium',
        {
          'bg-gray-100 text-gray-800': variant === 'default',
          'bg-success-100 text-success-800': variant === 'success',
          'bg-warning-100 text-warning-800': variant === 'warning',
          'bg-error-100 text-error-800': variant === 'error',
          'bg-primary-100 text-primary-800': variant === 'info',
        },
        className
      )}
      {...props}
    />
  );
}