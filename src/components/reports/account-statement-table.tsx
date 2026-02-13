"use client"

import { format, parseISO } from "date-fns"
import { tr } from "date-fns/locale"

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AccountStatementData } from "@/lib/reports/account-statement"

interface AccountStatementTableProps {
  data: AccountStatementData
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(dateString: string): string {
  return format(parseISO(dateString), "dd.MM.yyyy", { locale: tr })
}

export function AccountStatementTable({ data }: AccountStatementTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tarih</TableHead>
            <TableHead>Açıklama</TableHead>
            <TableHead className="text-right">Borç</TableHead>
            <TableHead className="text-right">Alacak</TableHead>
            <TableHead className="text-right">Borç Bakiye</TableHead>
            <TableHead className="text-right">Alacak Bakiye</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Opening balance (Devir) row */}
          <TableRow className="bg-muted/50 font-medium">
            <TableCell colSpan={2}>Devir</TableCell>
            <TableCell className="text-right" />
            <TableCell className="text-right" />
            <TableCell className="text-right">
              {data.openingNet > 0 ? formatCurrency(data.openingNet) : ""}
            </TableCell>
            <TableCell className="text-right">
              {data.openingNet < 0
                ? formatCurrency(Math.abs(data.openingNet))
                : ""}
            </TableCell>
          </TableRow>

          {/* Period entries */}
          {data.entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{formatDate(entry.date)}</TableCell>
              <TableCell>{entry.statement || ""}</TableCell>
              <TableCell className="text-right">
                {entry.debt > 0 ? formatCurrency(entry.debt) : ""}
              </TableCell>
              <TableCell className="text-right">
                {entry.receivable > 0
                  ? formatCurrency(entry.receivable)
                  : ""}
              </TableCell>
              <TableCell className="text-right">
                {entry.runningNet > 0
                  ? formatCurrency(entry.runningNet)
                  : ""}
              </TableCell>
              <TableCell className="text-right">
                {entry.runningNet < 0
                  ? formatCurrency(Math.abs(entry.runningNet))
                  : ""}
              </TableCell>
            </TableRow>
          ))}

          {data.entries.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                Bu tarih aralığında kayıt bulunamadı.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        <TableFooter>
          <TableRow className="font-bold">
            <TableCell colSpan={2}>Toplam</TableCell>
            <TableCell className="text-right">
              {formatCurrency(data.totalDebt)}
            </TableCell>
            <TableCell className="text-right">
              {formatCurrency(data.totalReceivable)}
            </TableCell>
            <TableCell className="text-right">
              {data.closingNet > 0
                ? formatCurrency(data.closingNet)
                : ""}
            </TableCell>
            <TableCell className="text-right">
              {data.closingNet < 0
                ? formatCurrency(Math.abs(data.closingNet))
                : ""}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}
