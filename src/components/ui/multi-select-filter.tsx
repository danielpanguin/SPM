"use client"

import { useState } from "react"
import { Check, Search, X } from "lucide-react"
import { Button } from "@/components/ui/ViewTaskUi/button"
import { Input } from "@/components/ui/ViewTaskUi/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/ViewTaskUi/popover"
import { Badge } from "@/components/ui/ViewTaskUi/badge"
import { ScrollArea } from "@/components/ui/ViewTaskUi/scroll-area"
import { Checkbox } from "@/components/ui/ViewTaskUi/checkbox"

interface MultiSelectFilterProps {
  label: string
  options: { value: string; label: string }[]
  selectedValues: string[]
  onChange: (values: string[]) => void
  onClear: () => void
  placeholder?: string
}

export function MultiSelectFilter({
  label,
  options,
  selectedValues,
  onChange,
  onClear,
  placeholder = "Select..."
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
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
          className="w-full justify-between mt-1"
        >
          {selectedValues.length > 0 ? (
            <div className="flex gap-1 flex-wrap">
              {selectedValues.slice(0, 2).map(val => (
                <Badge key={val} variant="secondary" className="text-xs">
                  {options.find(o => o.value === val)?.label || val}
                </Badge>
              ))}
              {selectedValues.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{selectedValues.length - 2}
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <X
            className={`ml-2 h-4 w-4 shrink-0 opacity-50 ${selectedValues.length === 0 ? 'hidden' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              clearAll()
            }}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 shadow-lg" align="start">
        <div className="flex flex-col">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${label.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-2 border-b">
            <span className="text-sm font-medium">{label}</span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={selectAll}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={clearAll}
              >
                Clear
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[200px]">
            <div className="p-2 space-y-1">
              {filteredOptions.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No results found
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-2 p-2 rounded-sm hover:bg-accent cursor-pointer"
                    onClick={() => toggleOption(option.value)}
                  >
                    <Checkbox
                      checked={selectedValues.includes(option.value)}
                      onCheckedChange={() => toggleOption(option.value)}
                    />
                    <label className="text-sm cursor-pointer flex-1">
                      {option.label}
                    </label>
                    {selectedValues.includes(option.value) && (
                      <Check className="h-4 w-4" />
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  )
}
