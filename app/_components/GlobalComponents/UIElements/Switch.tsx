"use client";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export const Switch = ({ checked, onCheckedChange, className = "", disabled = false }: SwitchProps) => {
  return (
    <label className={className}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        disabled={disabled}
        className="terminal-font"
      />
    </label>
  );
};
