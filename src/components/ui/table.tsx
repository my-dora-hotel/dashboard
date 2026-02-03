"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface TableProps extends React.ComponentProps<"table"> {
  stickyHeader?: boolean
  stickyFooter?: boolean
  maxHeight?: string
}

function Table({
  className,
  stickyHeader,
  stickyFooter,
  maxHeight,
  ...props
}: TableProps) {
  const useScrollContainer = stickyHeader ?? stickyFooter ?? false
  return (
    <div
      data-slot="table-container"
      className={cn(
        "relative w-full",
        useScrollContainer ? "flex-1 overflow-auto" : "overflow-x-auto"
      )}
      style={
        useScrollContainer
          ? { maxHeight: maxHeight ?? "calc(100vh - 200px)" }
          : undefined
      }
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

interface TableHeaderProps extends React.ComponentProps<"thead"> {
  sticky?: boolean
}

function TableHeader({ className, sticky, ...props }: TableHeaderProps) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "[&_tr]:border-b",
        sticky &&
          "sticky top-0 z-10 bg-muted border-b shadow-[0_2px_6px_-4px_rgba(0,0,0,0.1)] [&>tr]:bg-muted [&>tr:first-child>th:first-child]:rounded-tl-md [&>tr:first-child>th:last-child]:rounded-tr-md",
        className
      )}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

interface TableFooterProps extends React.ComponentProps<"tfoot"> {
  sticky?: boolean
}

function TableFooter({ className, sticky, ...props }: TableFooterProps) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        sticky &&
          "sticky bottom-0 z-10 bg-muted border-t shadow-[0_-2px_6px_-4px_rgba(0,0,0,0.1)] [&>tr]:bg-muted [&>tr:last-child>td:first-child]:rounded-bl-md [&>tr:last-child>td:last-child]:rounded-br-md",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-foreground h-10 px-4 text-left align-middle font-medium whitespace-nowrap first:pl-6 last:pr-6 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-4 py-2 align-middle whitespace-nowrap first:pl-6 last:pr-6 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
