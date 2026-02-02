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
import { Category } from "@/types/database";

const ALL_CATEGORIES_VALUE = "";

interface CategoryComboboxProps {
  categories: Category[];
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  /** Placeholder when no category is selected (e.g. "Tüm kategoriler") */
  placeholder?: string;
  /** When true, adds an "Tüm kategoriler" option at the top that sets value to empty */
  includeAllOption?: boolean;
}

export function CategoryCombobox({
  categories,
  value,
  onValueChange,
  disabled,
  placeholder = "Kategori seçin...",
  includeAllOption = false,
}: CategoryComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedCategory = categories.find((cat) => cat.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full min-w-0 justify-between gap-2"
          disabled={disabled}
        >
          <span className="min-w-0 truncate text-left">
            {selectedCategory
              ? `${selectedCategory.id} - ${selectedCategory.name}`
              : placeholder}
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
          <CommandInput placeholder="Kategori ara..." />
          <CommandList>
            <CommandEmpty>Kategori bulunamadı.</CommandEmpty>
            <CommandGroup>
              {includeAllOption && (
                <CommandItem
                  value="Tüm kategoriler"
                  onSelect={() => {
                    onValueChange(ALL_CATEGORIES_VALUE);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === ALL_CATEGORIES_VALUE ? "opacity-100" : "opacity-0"
                    )}
                  />
                  Tüm kategoriler
                </CommandItem>
              )}
              {categories.map((category) => (
                <CommandItem
                  key={category.id}
                  value={`${category.id} ${category.name}`}
                  onSelect={() => {
                    onValueChange(category.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === category.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="font-mono mr-2">{category.id}</span>
                  <span>{category.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
