"use client";

import { useState, useEffect } from "react";
import { Button } from "./Button";
import { ChevronDown, User, X } from "lucide-react";
import { fetchAvailableUsers } from "@/app/_server/actions/cronjobs";

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
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading users...</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      >
        <div className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span className="text-sm">
            {selectedUser ? `User: ${selectedUser}` : "All users"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {selectedUser && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUserChange(null);
              }}
              className="p-1 hover:bg-accent rounded"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown className="h-4 w-4" />
        </div>
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
          <button
            onClick={() => {
              onUserChange(null);
              setIsOpen(false);
            }}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${!selectedUser ? "bg-accent text-accent-foreground" : ""
              }`}
          >
            All users
          </button>
          {users.map((user) => (
            <button
              key={user}
              onClick={() => {
                onUserChange(user);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${selectedUser === user ? "bg-accent text-accent-foreground" : ""
                }`}
            >
              {user}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
