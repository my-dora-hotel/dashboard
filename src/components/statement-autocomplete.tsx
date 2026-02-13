"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { normalizeForSearch } from "@/lib/search-utils"

/**
 * Highlights matching parts of the text based on the search query.
 * Returns an array of React nodes with matching parts wrapped in <mark>.
 */
function highlightMatches(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text

  const normalizedQuery = normalizeForSearch(query)
  const normalizedText = normalizeForSearch(text)

  // Find all positions where the query matches in the normalized text
  const matchPositions: { start: number; end: number }[] = []
  let searchIndex = 0

  while (searchIndex < normalizedText.length) {
    const matchIndex = normalizedText.indexOf(normalizedQuery, searchIndex)
    if (matchIndex === -1) break
    matchPositions.push({
      start: matchIndex,
      end: matchIndex + normalizedQuery.length,
    })
    searchIndex = matchIndex + 1
  }

  if (matchPositions.length === 0) return text

  // Build the result with highlighted matches
  const result: React.ReactNode[] = []
  let lastEnd = 0

  matchPositions.forEach((pos, index) => {
    // Add non-matching text before this match
    if (pos.start > lastEnd) {
      result.push(text.slice(lastEnd, pos.start))
    }
    // Add the matching text with highlight
    result.push(
      <mark
        key={index}
        className="bg-transparent font-medium text-foreground"
      >
        {text.slice(pos.start, pos.end)}
      </mark>
    )
    lastEnd = pos.end
  })

  // Add any remaining text after the last match
  if (lastEnd < text.length) {
    result.push(text.slice(lastEnd))
  }

  return result
}

interface StatementAutocompleteProps {
  value: string
  onValueChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  id?: string
  rows?: number
  autoResize?: boolean
  maxRows?: number
  className?: string
}

export function StatementAutocomplete({
  value,
  onValueChange,
  suggestions,
  placeholder = "İşlem açıklaması",
  id,
  rows = 4,
  autoResize = false,
  maxRows = 5,
  className,
}: StatementAutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)

  // Auto-resize textarea based on content
  const adjustHeight = React.useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea || !autoResize) return

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto'
    
    // Calculate line height (approximately 24px per line)
    const lineHeight = 24
    const minHeight = rows * lineHeight
    const maxHeight = maxRows * lineHeight
    
    // Set height based on content, constrained by min/max
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)
    textarea.style.height = `${newHeight}px`
  }, [autoResize, rows, maxRows])

  // Adjust height when value changes
  React.useEffect(() => {
    adjustHeight()
  }, [value, adjustHeight])

  // Filter suggestions based on current input
  const filteredSuggestions = React.useMemo(() => {
    if (!value.trim()) return suggestions.slice(0, 10)

    const normalizedValue = normalizeForSearch(value)
    return suggestions
      .filter((s) => normalizeForSearch(s).includes(normalizedValue))
      .slice(0, 10)
  }, [value, suggestions])

  // Reset selected index when suggestions change
  React.useEffect(() => {
    setSelectedIndex(0)
  }, [filteredSuggestions])

  // Show popover when there are matching suggestions and user is typing
  const shouldShowSuggestions =
    filteredSuggestions.length > 0 && value.trim().length > 0

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue)
    setOpen(false)
    setSelectedIndex(0)
    // Focus back to textarea after selection
    textareaRef.current?.focus()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onValueChange(e.target.value)
    // Open popover when user starts typing
    if (e.target.value.trim().length > 0) {
      setOpen(true)
    } else {
      setOpen(false)
    }
  }

  // Do not open suggestions on focus — only when the user types (handleInputChange).

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    // Close popover when focus leaves, but not if clicking on the popover
    const relatedTarget = e.relatedTarget as HTMLElement
    if (!relatedTarget?.closest("[data-statement-autocomplete-list]")) {
      setOpen(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!open || !shouldShowSuggestions) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        )
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        )
        break
      case "Enter":
        e.preventDefault()
        if (filteredSuggestions[selectedIndex]) {
          handleSelect(filteredSuggestions[selectedIndex])
        }
        break
      case "Escape":
        e.preventDefault()
        setOpen(false)
        break
      case "Tab":
        setOpen(false)
        break
    }
  }

  // Scroll selected item into view
  React.useEffect(() => {
    if (open && listRef.current) {
      const selectedElement = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      )
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" })
      }
    }
  }, [selectedIndex, open])

  return (
    <Popover
      open={open && shouldShowSuggestions}
      onOpenChange={(next) => {
        // Only allow closing from outside (e.g. blur, Escape). Do not open on trigger click — open only when typing (handleInputChange).
        if (!next) setOpen(false)
      }}
    >
      <PopoverTrigger asChild>
        <Textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={rows}
          className={cn("resize-none", autoResize && "overflow-hidden", className)}
          style={autoResize ? { minHeight: `${rows * 24}px` } : undefined}
        />
      </PopoverTrigger>
      <PopoverContent
        className="p-0 overflow-hidden"
        align="start"
        side="bottom"
        sideOffset={4}
        style={{ width: "var(--radix-popover-trigger-width)" }}
        onOpenAutoFocus={(e) => {
          // Prevent the popover from stealing focus from the textarea
          e.preventDefault()
        }}
      >
        <div
          ref={listRef}
          data-statement-autocomplete-list
          className="max-h-[200px] min-h-0 overflow-y-auto overscroll-contain"
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="p-1">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Öneriler
            </div>
            {filteredSuggestions.map((suggestion, index) => (
              <div
                key={`${suggestion}-${index}`}
                data-index={index}
                onClick={() => handleSelect(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                  index === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4 shrink-0",
                    value === suggestion ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="truncate text-muted-foreground">
                  {highlightMatches(suggestion, value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
