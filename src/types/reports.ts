import { ReportRow } from "./database";

export type ReportType = "account_statement" | "account_summary";

export type AccountSummaryFilterOption =
  | "all"
  | "onlyDebtBalance"
  | "onlyReceivableBalance"
  | "onlyActive";

export interface AccountStatementParameters {
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  accountId: string;
}

export interface AccountSummaryParameters {
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  categoryId: string | null; // null means all categories
  filterOption: AccountSummaryFilterOption;
}

export type ReportParameters =
  | AccountStatementParameters
  | AccountSummaryParameters;

export interface Report extends Omit<ReportRow, "parameters"> {
  parameters: ReportParameters;
}

export interface AccountStatementReport extends Report {
  type: "account_statement";
  parameters: AccountStatementParameters;
}

export interface AccountSummaryReport extends Report {
  type: "account_summary";
  parameters: AccountSummaryParameters;
}
