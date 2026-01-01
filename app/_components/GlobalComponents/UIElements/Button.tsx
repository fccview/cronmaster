import { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', children, ...props }, ref) => {
    const baseClasses = 'terminal-font border border-border px-4 py-2 cursor-pointer inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed';
    const variantClasses = {
      default: 'bg-background1 hover:bg-background2',
      destructive: 'text-status-error hover:bg-status-error hover:text-white',
      outline: 'bg-background0 hover:bg-background1',
      secondary: 'bg-background2 hover:bg-background1',
      ghost: 'border-0 bg-transparent hover:bg-background1',
      link: 'border-0 underline bg-transparent',
    };
    const sizeClasses = {
      default: '',
      sm: 'px-2 py-1 text-sm',
      lg: 'px-6 py-3',
      icon: 'p-2',
    };

    return (
      <button
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
