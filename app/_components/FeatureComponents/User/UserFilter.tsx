"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { CaretDownIcon, UserIcon, XIcon } from "@phosphor-icons/react";
import { fetchAvailableUsers } from "@/app/_server/actions/cronjobs";
import { useTranslations } from "next-intl";

interface UserFilterProps {
  selectedUser: string | null;
  onUserChange: (user: string | null) => void;
  className?: string;
}

export const UserFilter = ({
  selectedUser,
  onUserChange,
  className = "",
}: UserFilterProps) => {
  const [users, setUsers] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const t = useTranslations();

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const availableUsers = await fetchAvailableUsers();
        setUsers(availableUsers);
      } catch (error) {
        console.error("Error loading users:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, []);

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
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 justify-between"
        >
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            <span className="text-sm">
              {selectedUser
                ? `${t("common.userWithUsername", { user: selectedUser })}`
                : t("common.allUsers")}
            </span>
          </div>
          <CaretDownIcon className="h-4 w-4" />
        </Button>
        {selectedUser && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUserChange(null)}
            className="p-2 h-8 w-8 flex-shrink-0"
          >
            <XIcon className="h-3 w-3" />
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 p-1 mt-1 bg-background0 border border-border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto tui-scrollbar">
          <button
            onClick={() => {
              onUserChange(null);
              setIsOpen(false);
            }}
            className={`w-full text-left px-3 py-2 text-sm hover:border-border transition-colors ${!selectedUser ? "border border-border" : "border border-transparent"
              }`}
          >
            {t("common.allUsers")}
          </button>
          {users.map((user) => (
            <button
              key={user}
              onClick={() => {
                onUserChange(user);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm border border-transparent hover:border-border transition-colors ${selectedUser === user ? "border border-border" : "border border-transparent"
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
