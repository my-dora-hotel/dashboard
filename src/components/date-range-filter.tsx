"use client"

import * as React from "react"
import { format, subDays, subMonths, startOfDay, endOfDay } from "date-fns"
import { tr } from "date-fns/locale"
import { IconCalendar, IconChevronDown } from "@tabler/icons-react"
import { type DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const presetRanges = [
  { label: "Son 7 gün", days: 7 },
  { label: "Son 30 gün", days: 30 },
  { label: "Son 90 gün", days: 90 },
  { label: "Tüm Zamanlar", days: null },
]

interface DateRangeFilterProps {
  startDate: Date | undefined
  endDate: Date | undefined
  onRangeChange: (start: Date | undefined, end: Date | undefined) => void
  className?: string
}

export function DateRangeFilter({
  startDate,
  endDate,
  onRangeChange,
  className,
}: DateRangeFilterProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedPreset, setSelectedPreset] = React.useState<number | "all" | null>(90)
  
  // Internal state for the calendar selection
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined)

  // Initialize with default 90 days on mount
  React.useEffect(() => {
    if (!startDate && !endDate) {
      const today = new Date()
      const end = endOfDay(today)
      const start = startOfDay(subDays(today, 89))
      onRangeChange(start, end)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // When popover opens, sync from props
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Opening - initialize from props
      setDateRange(
        startDate && endDate ? { from: startDate, to: endDate } : undefined
      )
    }
    setOpen(newOpen)
  }

  const handlePresetClick = (days: number | null) => {
    if (days === null) {
      // "Tüm Zamanlar" - clear date filters
      setSelectedPreset("all")
      setDateRange(undefined)
      onRangeChange(undefined, undefined)
    } else {
      const today = new Date()
      const end = endOfDay(today)
      const start = startOfDay(subDays(today, days - 1))
      setSelectedPreset(days)
      setDateRange({ from: start, to: end })
      onRangeChange(start, end)
    }
  }

  // Standard onSelect handler - react-day-picker manages the two-click flow
  const handleSelect = (range: DateRange | undefined) => {
    setDateRange(range)
    
    // When both dates are selected, apply the change (but don't auto-close)
    if (range?.from && range?.to) {
      setSelectedPreset(null)
      onRangeChange(startOfDay(range.from), endOfDay(range.to))
    }
  }

  const getDisplayText = () => {
    if (selectedPreset === "all") {
      return "Tüm Zamanlar"
    }
    if (selectedPreset && startDate && endDate) {
      const preset = presetRanges.find((p) => p.days === selectedPreset)
      if (preset) {
        return `${preset.label} (${format(startDate, "d MMM", { locale: tr })} - ${format(endDate, "d MMM yyyy", { locale: tr })})`
      }
    }
    if (startDate && endDate) {
      return `${format(startDate, "d MMM yyyy", { locale: tr })} - ${format(endDate, "d MMM yyyy", { locale: tr })}`
    }
    if (startDate) {
      return `${format(startDate, "d MMM yyyy", { locale: tr })} - ...`
    }
    return "Tarih aralığı seçin"
  }

  // Show the month containing the end date (or current month)
  const defaultMonth = React.useMemo(() => {
    const dateToShow = dateRange?.to || dateRange?.from || endDate || new Date()
    return subMonths(dateToShow, 1)
  }, [dateRange, endDate])

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !startDate && !endDate && selectedPreset !== "all" && "text-muted-foreground",
            className
          )}
        >
          <IconCalendar className="mr-2 h-4 w-4" />
          <span className="flex-1">{getDisplayText()}</span>
          <IconChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 border-b">
          <div className="flex flex-wrap gap-2">
            {presetRanges.map((preset) => {
              const isSelected = preset.days === null 
                ? selectedPreset === "all" 
                : selectedPreset === preset.days
              return (
                <Button
                  key={preset.days ?? "all"}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePresetClick(preset.days)}
                >
                  {preset.label}
                </Button>
              )
            })}
          </div>
        </div>
        <div className="p-3">
          <Calendar
            mode="range"
            defaultMonth={defaultMonth}
            selected={dateRange}
            onSelect={handleSelect}
            numberOfMonths={2}
            locale={tr}
            showOutsideDays={false}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
