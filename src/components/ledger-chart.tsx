"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { format, parseISO, eachDayOfInterval, startOfDay, min, max } from "date-fns"
import { tr } from "date-fns/locale"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { LedgerEntryWithRelations } from "@/types/database"

const chartConfig = {
  receivable: {
    label: "Alacak",
    theme: {
      light: "hsl(var(--chart-1))",
      dark: "oklch(0.85 0 0)",
    },
  },
  debt: {
    label: "Borç",
    theme: {
      light: "hsl(var(--chart-2))",
      dark: "oklch(0.75 0 0)",
    },
  },
} satisfies ChartConfig

interface LedgerChartProps {
  entries: LedgerEntryWithRelations[]
  startDate?: Date
  endDate?: Date
}

export function LedgerChart({ entries, startDate, endDate }: LedgerChartProps) {
  const chartData = React.useMemo(() => {
    // Use provided date range or fall back to entries date range
    let rangeStart: Date
    let rangeEnd: Date

    if (startDate && endDate) {
      rangeStart = startOfDay(startDate)
      rangeEnd = startOfDay(endDate)
    } else if (entries.length > 0) {
      const dates = entries.map((e) => parseISO(e.date))
      rangeStart = startOfDay(min(dates))
      rangeEnd = startOfDay(max(dates))
    } else {
      return []
    }

    try {
      // Create array of all days in range
      const allDays = eachDayOfInterval({ start: rangeStart, end: rangeEnd })

      // Group entries by day
      const dataByDay = new Map<string, { receivable: number; debt: number }>()

      // Initialize all days with zero values
      allDays.forEach((day) => {
        const key = format(day, "yyyy-MM-dd")
        dataByDay.set(key, { receivable: 0, debt: 0 })
      })

      // Sum up entries for each day
      entries.forEach((entry) => {
        const key = entry.date
        if (dataByDay.has(key)) {
          const existing = dataByDay.get(key)!
          dataByDay.set(key, {
            receivable: existing.receivable + (entry.receivable || 0),
            debt: existing.debt + (entry.debt || 0),
          })
        }
      })

      // Convert to array and sort by date
      return Array.from(dataByDay.entries())
        .map(([date, values]) => ({
          date,
          receivable: values.receivable,
          debt: values.debt,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
    } catch (error) {
      console.error("Chart data error:", error)
      return []
    }
  }, [entries, startDate, endDate])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <Card className="@container/chart">
      <CardHeader>
        <CardTitle>Günlük Alacak & Borç</CardTitle>
        <CardDescription>
          Seçilen dönemdeki günlük alacak ve borç dağılımı
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {chartData.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center text-muted-foreground">
            Seçilen tarih aralığında veri bulunamadı
          </div>
        ) : (
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillReceivable" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-receivable)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-receivable)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillDebt" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-debt)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-debt)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = parseISO(value)
                return format(date, "d MMM", { locale: tr })
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => formatCurrency(value)}
              width={80}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return format(parseISO(value), "d MMMM yyyy", { locale: tr })
                  }}
                  formatter={(value, name) => (
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                        style={{
                          backgroundColor: `var(--color-${name})`,
                        }}
                      />
                      <span className="text-muted-foreground">
                        {chartConfig[name as keyof typeof chartConfig]?.label}:
                      </span>
                      <span className="font-medium">
                        {formatCurrency(value as number)}
                      </span>
                    </div>
                  )}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="receivable"
              type="natural"
              fill="url(#fillReceivable)"
              stroke="var(--color-receivable)"
              stackId="a"
            />
            <Area
              dataKey="debt"
              type="natural"
              fill="url(#fillDebt)"
              stroke="var(--color-debt)"
              stackId="b"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
