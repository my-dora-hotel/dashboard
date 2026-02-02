"use client"

import * as React from "react"
import { format, subMonths, startOfDay, endOfDay } from "date-fns"
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

const PRESET_TODAY = "today"
const PRESET_ALL = "all"

const presetRanges = [
  { label: "Bugün", value: PRESET_TODAY as const },
  { label: "Tüm Zamanlar", value: PRESET_ALL as const },
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
  const [selectedPreset, setSelectedPreset] = React.useState<typeof PRESET_TODAY | typeof PRESET_ALL | null>(PRESET_TODAY)

  // Internal state for the calendar selection
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined)

  // Initialize with "Bugün" (today) on mount
  React.useEffect(() => {
    if (!startDate && !endDate) {
      const today = new Date()
      onRangeChange(startOfDay(today), endOfDay(today))
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

  const handlePresetClick = (value: typeof PRESET_TODAY | typeof PRESET_ALL) => {
    if (value === PRESET_ALL) {
      setSelectedPreset(PRESET_ALL)
      setDateRange(undefined)
      onRangeChange(undefined, undefined)
    } else {
      // Bugün = single day (today)
      const today = new Date()
      const start = startOfDay(today)
      const end = endOfDay(today)
      setSelectedPreset(PRESET_TODAY)
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
    if (selectedPreset === PRESET_ALL) {
      return "Tüm Zamanlar"
    }
    if (selectedPreset === PRESET_TODAY && startDate && endDate) {
      return `Bugün (${format(startDate, "d MMM yyyy", { locale: tr })})`
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
            !startDate && !endDate && selectedPreset !== PRESET_ALL && "text-muted-foreground",
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
              const isSelected = selectedPreset === preset.value
              return (
                <Button
                  key={preset.value}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePresetClick(preset.value)}
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
