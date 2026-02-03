"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { normalizeForSearch } from "@/lib/search-utils"
import { AccountWithCategory } from "@/types/database";

interface AccountComboboxProps {
  accounts: AccountWithCategory[];
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  categoryFilter?: string;
  className?: string;
}

export function AccountCombobox({
  accounts,
  value,
  onValueChange,
  disabled,
  categoryFilter,
  className,
}: AccountComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const filteredAccounts = categoryFilter
    ? accounts.filter((acc) => acc.category_id === categoryFilter)
    : accounts;

  const selectedAccount = accounts.find((acc) => acc.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between gap-2 focus-visible:ring-0 focus-visible:border-input",
            className
          )}
          disabled={disabled}
          style={{ maxWidth: '100%' }}
        >
          <span className="flex-1 truncate text-left overflow-hidden" style={{ minWidth: 0 }}>
            {selectedAccount
              ? selectedAccount.name
              : "Hesap seçin..."}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command
          filter={(value, search) =>
            normalizeForSearch(value).includes(normalizeForSearch(search))
              ? 1
              : 0
          }
        >
          <CommandInput placeholder="Hesap ara..." />
          <CommandList>
            <CommandEmpty>Hesap bulunamadı.</CommandEmpty>
            <CommandGroup>
              {filteredAccounts.map((account) => (
                <CommandItem
                  key={account.id}
                  value={`${account.name} ${account.categories.name}`}
                  onSelect={() => {
                    onValueChange(account.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === account.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{account.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {account.categories.name}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
