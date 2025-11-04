"use client";

import { useState, useRef, useEffect } from "react";

type User = {
  id: string;
  email?: string | null;
};

interface CollaboratorsDropdownProps {
  users: User[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  currentUserId?: string;
  disabled?: boolean;
  disabledIds?: string[];
  disabledTooltip?: string;
}

export default function CollaboratorsDropdown({
  users,
  selectedIds,
  onSelectionChange,
  currentUserId,
  disabled = false,
  disabledIds = [],
  disabledTooltip = "",
}: CollaboratorsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filter users by search query and sort: selected first, then alphabetically
  const filteredUsers = users
    .filter((user) => {
      const email = user.email || user.id;
      return email.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      const aSelected = selectedIds.includes(a.id);
      const bSelected = selectedIds.includes(b.id);

      // Selected users first
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;

      // Both selected or both not selected - sort alphabetically by email
      const aEmail = (a.email || a.id).toLowerCase();
      const bEmail = (b.email || b.id).toLowerCase();
      return aEmail.localeCompare(bEmail);
    });

  const toggleUser = (userId: string) => {
    if (disabledIds.includes(userId)) return;

    if (selectedIds.includes(userId)) {
      onSelectionChange(selectedIds.filter((id) => id !== userId));
    } else {
      onSelectionChange([...selectedIds, userId]);
    }
  };

  const clearAll = () => {
    // Keep only disabled users (those that cannot be removed)
    onSelectionChange(selectedIds.filter((id) => disabledIds.includes(id)));
  };

  const selectedCount = selectedIds.length;

  return (
    <div ref={dropdownRef} className="relative">
      {/* Dropdown trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full text-left rounded border p-2 bg-white flex items-center justify-between ${
          disabled ? "bg-gray-100 cursor-not-allowed" : "hover:border-gray-400 cursor-pointer"
        }`}
      >
        <span className="text-sm">
          {selectedCount === 0
            ? "Select collaborators..."
            : `${selectedCount} collaborator${selectedCount !== 1 ? "s" : ""} selected`}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-md shadow-lg max-h-80 flex flex-col">
          {/* Search input */}
          <div className="p-2 border-b sticky top-0 bg-white">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action buttons */}
          <div className="p-2 border-b flex items-center justify-between bg-gray-50">
            <span className="text-xs text-gray-600">
              {selectedCount} selected
            </span>
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-red-600 hover:text-red-800 font-medium"
              >
                Clear all
              </button>
            )}
          </div>

          {/* User list with checkboxes */}
          <div className="overflow-y-auto flex-1">
            {filteredUsers.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">
                No users found
              </div>
            ) : (
              <div className="py-1">
                {filteredUsers.map((user) => {
                  const isSelected = selectedIds.includes(user.id);
                  const isDisabled = disabledIds.includes(user.id);
                  const isCurrentUser = user.id === currentUserId;

                  return (
                    <label
                      key={user.id}
                      className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 ${
                        isDisabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                      }`}
                      title={isDisabled ? disabledTooltip : ""}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleUser(user.id)}
                        disabled={isDisabled}
                        className={isDisabled ? "cursor-not-allowed" : "cursor-pointer"}
                      />
                      <span className="text-sm flex-1">
                        {user.email || user.id}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-blue-600 font-medium">(You)</span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
