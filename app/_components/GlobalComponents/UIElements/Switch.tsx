"use client";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export const Switch = ({ checked, onCheckedChange, className = "", disabled = false, id }: SwitchProps) => {
  const handleClick = () => {
    if (!disabled) {
      onCheckedChange(!checked);
    }
  };

  return (
    <div
      className={`inline-flex items-center ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      onClick={handleClick}
      role="checkbox"
      aria-checked={checked}
      aria-labelledby={id}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === ' ' || e.key === 'Enter')) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="relative w-5 h-5 ascii-border bg-background0 transition-all focus-within:ring-2 focus-within:ring-primary/20 flex items-center justify-center group">
        {checked && (
          <svg
            className="w-3.5 h-3.5 text-primary transition-transform duration-200"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10 3L4.5 8.5L2 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
          </svg>
        )}
        <div className="absolute inset-0 border border-primary/0 group-hover:border-primary/50 transition-colors pointer-events-none" />
      </div>
    </div>
  );
};
