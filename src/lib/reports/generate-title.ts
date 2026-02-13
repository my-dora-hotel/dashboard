import { format } from "date-fns";
import type {
  ReportType,
  AccountStatementParameters,
  AccountSummaryParameters,
} from "@/types/reports";
import type { AccountWithCategory, Category } from "@/types/database";

/**
 * Generate report title based on report type and parameters
 */
export function generateReportTitle(
  type: ReportType,
  parameters: AccountStatementParameters | AccountSummaryParameters,
  account?: AccountWithCategory | null,
  category?: Category | null
): string {
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd.MM.yyyy");
  };

  // Detect "all time" range
  const isAllTime =
    parameters.startDate === "2000-01-01" && parameters.endDate === "2099-12-31";

  const hasDateRange = parameters.startDate !== "" && parameters.endDate !== "";
  const isSingleDay =
    hasDateRange && parameters.startDate === parameters.endDate;

  const dateRange = !hasDateRange
    ? ""
    : isAllTime
      ? "[Tüm Zamanlar]"
      : isSingleDay
        ? `[${formatDate(parameters.startDate)}]`
        : `[${formatDate(parameters.startDate)} - ${formatDate(parameters.endDate)}]`;

  if (type === "account_statement") {
    const accountName = account?.name || "";
    const parts = ["Hesap Ekstresi"];
    if (accountName) parts.push(`- ${accountName}`);
    if (dateRange) parts.push(dateRange);
    return parts.join(" ");
  } else {
    const params = parameters as AccountSummaryParameters;
    const parts = ["Hesap Özeti"];
    if (params.categoryId && category) parts.push(`- ${category.name}`);
    if (dateRange) parts.push(dateRange);
    return parts.join(" ");
  }
}
