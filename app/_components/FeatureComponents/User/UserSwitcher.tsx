"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { CaretDownIcon, UserIcon } from "@phosphor-icons/react";
import { fetchAvailableUsers } from "@/app/_server/actions/cronjobs";

interface UserSwitcherProps {
  selectedUser: string;
  onUserChange: (user: string) => void;
  className?: string;
}

export const UserSwitcher = ({
  selectedUser,
  onUserChange,
  className = "",
}: UserSwitcherProps) => {
  const [users, setUsers] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const availableUsers = await fetchAvailableUsers();
        setUsers(availableUsers);
        if (availableUsers.length > 0 && !selectedUser) {
          onUserChange(availableUsers[0]);
        }
      } catch (error) {
        console.error("Error loading users:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, [selectedUser, onUserChange]);

  if (isLoading) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md ${className}`}
      >
        <UserIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading users...</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Button
        type="button"
        variant="outline"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="w-full justify-between"
      >
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4" />
          <span className="text-sm">{selectedUser || "Select user"}</span>
        </div>
        <CaretDownIcon className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background0 border border-border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto tui-scrollbar">
          {users.map((user) => (
            <button
              type="button"
              key={user}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onUserChange(user);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${selectedUser === user ? "border border-border" : "border border-transparent"
                }`}
            >
              {user}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
