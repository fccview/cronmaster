import { InputHTMLAttributes, forwardRef } from 'react';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        className={`terminal-font ascii-border px-3 py-2 bg-background0 w-full ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
