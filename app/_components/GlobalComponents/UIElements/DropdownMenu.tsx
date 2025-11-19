"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { MoreVertical } from "lucide-react";

const DROPDOWN_HEIGHT = 200;

interface DropdownMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "destructive";
}

interface DropdownMenuProps {
  items: DropdownMenuItem[];
  triggerLabel?: string;
  triggerIcon?: ReactNode;
  triggerClassName?: string;
  onOpenChange?: (isOpen: boolean) => void;
}

export const DropdownMenu = ({
  items,
  triggerLabel,
  triggerIcon = <MoreVertical className="h-3 w-3" />,
  triggerClassName = "btn-outline h-8 px-3",
  onOpenChange,
}: DropdownMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [positionAbove, setPositionAbove] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleOpenChange = (open: boolean) => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      setPositionAbove(spaceBelow < DROPDOWN_HEIGHT && spaceAbove > spaceBelow);
    }
    setIsOpen(open);
    onOpenChange?.(open);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        handleOpenChange(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleOpenChange(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleItemClick = (item: DropdownMenuItem) => {
    if (!item.disabled) {
      item.onClick();
      handleOpenChange(false);
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <Button
        ref={triggerRef}
        variant="outline"
        size="sm"
        onClick={() => handleOpenChange(!isOpen)}
        className={triggerClassName}
        aria-label={triggerLabel || "Open menu"}
        title={triggerLabel || "Open menu"}
      >
        {triggerIcon}
        {triggerLabel && <span className="ml-2">{triggerLabel}</span>}
      </Button>

      {isOpen && (
        <div
          className={`absolute right-0 w-56 rounded-lg border border-border/50 bg-background shadow-lg z-[9999] overflow-hidden ${
            positionAbove ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          <div className="py-1">
            {items.map((item, index) => (
              <button
                key={index}
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
                className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                  item.disabled
                    ? "opacity-50 cursor-not-allowed"
                    : item.variant === "destructive"
                    ? "text-destructive hover:bg-destructive/10"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                {item.icon && (
                  <span className="flex-shrink-0">{item.icon}</span>
                )}
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
