"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";
import { Category } from "@/types/database";

interface CategoryItem {
  label: string;
  value: string;
}

interface CategoryComboboxProps {
  categories: Category[];
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  includeAllOption?: boolean;
  /** Set to false when used inside a Dialog to avoid inert/portal issues */
  portal?: boolean;
}

export function CategoryCombobox({
  categories,
  value,
  onValueChange,
  disabled,
  placeholder = "Kategori seçin...",
  includeAllOption = false,
  portal,
}: CategoryComboboxProps) {
  const items = React.useMemo<CategoryItem[]>(() => {
    const categoryItems: CategoryItem[] = categories.map((c) => ({
      label: c.name,
      value: c.id,
    }))

    if (includeAllOption) {
      return [{ label: placeholder, value: "" }, ...categoryItems]
    }

    return categoryItems
  }, [categories, includeAllOption, placeholder])

  const selectedItem = React.useMemo(
    () => items.find((item) => item.value === value),
    [items, value]
  )

  const handleValueChange = (
    selected: CategoryItem | CategoryItem[] | null
  ) => {
    if (selected === null) {
      onValueChange("")
      return
    }
    const item = Array.isArray(selected) ? selected[0] : selected
    onValueChange(item?.value ?? "")
  }

  return (
    <Combobox
      items={items}
      value={selectedItem ?? null}
      onValueChange={handleValueChange}
      disabled={disabled}
      itemToStringValue={(item) => item.label}
    >
      <ComboboxTrigger
        render={
          <Button
            variant="outline"
            className="w-full justify-between font-normal overflow-hidden focus-visible:ring-0 focus-visible:ring-offset-0"
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
        <ComboboxEmpty>Kategori bulunamadı.</ComboboxEmpty>
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
