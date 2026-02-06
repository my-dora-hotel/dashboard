"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox"
import { normalizeForSearch } from "@/lib/search-utils"

export interface ComboboxOption {
  label: string
  value: string
}

interface ComboboxSelectProps {
  /** Pre-mapped items with { label, value } shape */
  items: ComboboxOption[]
  /** Currently selected value (string id) */
  value: string
  /** Called with the selected item's value string */
  onValueChange: (value: string) => void
  /** Placeholder text shown when no item is selected */
  placeholder?: string
  /** Text shown when the search yields no results */
  emptyMessage?: string
  /** If true, prepends an "all" option using the placeholder as its label */
  includeAllOption?: boolean
  /** Set to false when used inside a Dialog to avoid inert/portal issues */
  portal?: boolean
  /** Whether the combobox is disabled */
  disabled?: boolean
  /** Additional className for the trigger button */
  className?: string
}

export function ComboboxSelect({
  items: externalItems,
  value,
  onValueChange,
  placeholder = "Seçin...",
  emptyMessage = "Sonuç bulunamadı.",
  includeAllOption = false,
  portal,
  disabled,
  className,
}: ComboboxSelectProps) {
  const items = React.useMemo<ComboboxOption[]>(() => {
    if (includeAllOption) {
      return [{ label: placeholder, value: "" }, ...externalItems]
    }
    return externalItems
  }, [externalItems, includeAllOption, placeholder])

  const selectedItem = React.useMemo(
    () => items.find((item) => item.value === value),
    [items, value]
  )

  const handleValueChange = (
    selected: ComboboxOption | ComboboxOption[] | null
  ) => {
    if (selected === null) {
      onValueChange("")
      return
    }
    const item = Array.isArray(selected) ? selected[0] : selected
    onValueChange(item?.value ?? "")
  }

  const turkishFilter = React.useCallback(
    (item: ComboboxOption, query: string) => {
      return normalizeForSearch(item.label).includes(normalizeForSearch(query))
    },
    []
  )

  return (
    <Combobox
      items={items}
      value={selectedItem ?? null}
      onValueChange={handleValueChange}
      disabled={disabled}
      itemToStringValue={(item) => item.label}
      filter={turkishFilter}
    >
      <ComboboxTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "w-full justify-between font-normal overflow-hidden",
              className
            )}
          >
            <span className="truncate">
              <ComboboxValue placeholder={placeholder} />
            </span>
            <ChevronDownIcon className="text-muted-foreground shrink-0 size-4" />
          </Button>
        }
      />
      <ComboboxContent portal={portal}>
        <ComboboxInput showTrigger={false} placeholder="Ara..." />
        <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
