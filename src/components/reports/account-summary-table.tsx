"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AccountSummaryData } from "@/lib/reports/account-summary"

interface AccountSummaryTableProps {
  data: AccountSummaryData
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function AccountSummaryTable({ data }: AccountSummaryTableProps) {
  return (
    <div className="flex flex-col gap-6">
      {data.groups.map((group) => (
        <div key={group.category.id} className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead colSpan={5} className="bg-muted/50 text-base font-semibold">
                  {group.category.name}
                </TableHead>
              </TableRow>
              <TableRow>
                <TableHead>Hesap Adı</TableHead>
                <TableHead className="text-right">Borç</TableHead>
                <TableHead className="text-right">Alacak</TableHead>
                <TableHead className="text-right">Borç Bakiye</TableHead>
                <TableHead className="text-right">Alacak Bakiye</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.accounts.map((row) => (
                <TableRow key={row.account.id}>
                  <TableCell>{row.account.name}</TableCell>
                  <TableCell className="text-right">
                    {row.totalDebt > 0 ? formatCurrency(row.totalDebt) : ""}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.totalReceivable > 0
                      ? formatCurrency(row.totalReceivable)
                      : ""}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.net > 0 ? formatCurrency(row.net) : ""}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.net < 0 ? formatCurrency(Math.abs(row.net)) : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="font-bold">
                <TableCell>{group.category.name} Toplam</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(group.totalDebt)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(group.totalReceivable)}
                </TableCell>
                <TableCell className="text-right">
                  {group.net > 0 ? formatCurrency(group.net) : ""}
                </TableCell>
                <TableCell className="text-right">
                  {group.net < 0 ? formatCurrency(Math.abs(group.net)) : ""}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      ))}

      {data.groups.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border py-12">
          <p className="text-muted-foreground">
            Bu tarih aralığında hesap hareketi bulunamadı.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableFooter>
              <TableRow className="font-bold text-base">
                <TableCell>Genel Toplam</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(data.totalDebt)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(data.totalReceivable)}
                </TableCell>
                <TableCell className="text-right">
                  {data.totalNet > 0 ? formatCurrency(data.totalNet) : ""}
                </TableCell>
                <TableCell className="text-right">
                  {data.totalNet < 0
                    ? formatCurrency(Math.abs(data.totalNet))
                    : ""}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </div>
  )
}
