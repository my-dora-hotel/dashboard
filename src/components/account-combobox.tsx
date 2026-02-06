"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { AccountWithCategory } from "@/types/database";

interface AccountItem {
  label: string;
  value: string;
}

interface AccountComboboxProps {
  accounts: AccountWithCategory[];
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  categoryFilter?: string;
  className?: string;
  placeholder?: string;
  includeAllOption?: boolean;
  /** Set to false when used inside a Dialog to avoid inert/portal issues */
  portal?: boolean;
}

export function AccountCombobox({
  accounts,
  value,
  onValueChange,
  disabled,
  categoryFilter,
  className,
  placeholder = "Hesap seçin...",
  includeAllOption = false,
  portal,
}: AccountComboboxProps) {
  const filteredAccounts = categoryFilter
    ? accounts.filter((acc) => acc.category_id === categoryFilter)
    : accounts

  const items = React.useMemo<AccountItem[]>(() => {
    const accountItems: AccountItem[] = filteredAccounts.map((a) => ({
      label: a.name,
      value: a.id,
    }))

    if (includeAllOption) {
      return [{ label: placeholder, value: "" }, ...accountItems]
    }

    return accountItems
  }, [filteredAccounts, includeAllOption, placeholder])

  const selectedItem = React.useMemo(
    () => items.find((item) => item.value === value),
    [items, value]
  )

  const handleValueChange = (
    selected: AccountItem | AccountItem[] | null
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
            className={cn("w-full justify-between font-normal overflow-hidden focus-visible:ring-0 focus-visible:ring-offset-0", className)}
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
        <ComboboxEmpty>Hesap bulunamadı.</ComboboxEmpty>
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
