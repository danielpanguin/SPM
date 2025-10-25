"use client"

import { useState } from "react"
import { Check, Search } from "lucide-react"
import { Button } from "@/components/ui/ViewTaskUi/button"
import { Input } from "@/components/ui/ViewTaskUi/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/ViewTaskUi/popover"
import { Checkbox } from "@/components/ui/ViewTaskUi/checkbox"

interface MultiSelectFilterProps {
  label: string
  options: { value: string; label: string }[]
  selectedValues: string[]
  onChange: (values: string[]) => void
  onClear: () => void
  placeholder?: string
  currentUserId?: string
}

export function MultiSelectFilter({
  label,
  options,
  selectedValues,
  onChange,
  onClear,
  placeholder = "Select...",
  currentUserId
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredOptions = options.filter(option =>
    typeof option.label === 'string' && option.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleOption = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value))
    } else {
      onChange([...selectedValues, value])
    }
  }

  const selectAll = () => {
    onChange(filteredOptions.map(opt => opt.value))
  }

  const clearAll = () => {
    onChange([])
    onClear()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between border-gray-300 hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500 font-normal h-10 bg-white shadow-sm"
        >
          <span className="text-gray-700 truncate">
            {selectedValues.length === 0 
              ? placeholder
              : selectedValues.length === 1 
              ? (() => {
                  const selectedOption = options.find(o => o.value === selectedValues[0])
                  const isCurrentUser = currentUserId && selectedValues[0] === currentUserId
                  return isCurrentUser 
                    ? `${selectedOption?.label || "1 selected"} (You)` 
                    : selectedOption?.label || "1 selected"
                })()
              : `${selectedValues.length} selected`}
          </span>
          <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 shadow-xl border-gray-300 bg-white z-50" align="start" side="bottom" sideOffset={4}>
        <div className="p-2 bg-gradient-to-r from-indigo-50 to-blue-50">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder={`Search ${label.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-gray-300 focus:border-indigo-500 bg-white h-9"
            />
          </div>
        </div>
        <div className="border-t border-gray-200">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800">{label}</span>
              <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-medium">
                {selectedValues.length} of {options.length}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100"
                onClick={selectAll}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-200"
                onClick={clearAll}
              >
                Clear
              </Button>
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto p-1.5 bg-white">
            {filteredOptions.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-4">
                No results found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option.value)
                return (
                  <div
                    key={option.value}
                    className={`flex items-center space-x-2.5 p-2 rounded-md cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-indigo-50 border border-indigo-200' 
                        : 'hover:bg-gray-100 border border-transparent'
                    }`}
                    onClick={() => toggleOption(option.value)}
                  >
                    <Checkbox
                      checked={isSelected}
                      className="border-2 pointer-events-none"
                    />
                    <label className={`text-sm flex-1 cursor-pointer font-medium ${
                      isSelected ? 'text-indigo-700' : 'text-gray-700'
                    }`}>
                      {option.label}
                      {currentUserId && option.value === currentUserId && (
                        <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-normal">
                          You
                        </span>
                      )}
                    </label>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
