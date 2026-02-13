import { createClient } from "@/lib/supabase/client";
import type { AccountStatementParameters } from "@/types/reports";

export interface AccountStatementEntry {
  id: string;
  date: string;
  statement: string | null;
  debt: number;
  receivable: number;
  /** net = debt - receivable for this entry */
  net: number;
  /** Cumulative running net: opening_net + sum of all nets up to this entry */
  runningNet: number;
}

export interface AccountStatementData {
  /** opening_net = (all debts before start) - (all receivables before start) */
  openingNet: number;
  /** Entries within the selected date range, sorted chronologically */
  entries: AccountStatementEntry[];
  /** Sum of debt column for entries in range */
  totalDebt: number;
  /** Sum of receivable column for entries in range */
  totalReceivable: number;
  /** Final running net after all entries */
  closingNet: number;
}

/** RPC response shape from get_account_statement */
interface AccountStatementRpcRow {
  id: string;
  date: string;
  statement: string | null;
  debt: number;
  receivable: number;
  runningNet: number;
}

/**
 * Fetch account statement via DB RPC. All aggregation and running balance
 * are computed in PostgreSQL; only the result set is transferred.
 */
export async function fetchAccountStatement(
  parameters: AccountStatementParameters
): Promise<AccountStatementData> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_account_statement", {
    p_account_id: parameters.accountId,
    p_start_date: parameters.startDate,
    p_end_date: parameters.endDate,
  });

  if (error) {
    throw new Error(`Failed to fetch account statement: ${error.message}`);
  }

  const raw = data as unknown as {
    openingNet: number;
    entries: AccountStatementRpcRow[];
    totalDebt: number;
    totalReceivable: number;
    closingNet: number;
  };

  const entries: AccountStatementEntry[] = (raw.entries || []).map((e) => ({
    id: e.id,
    date: e.date,
    statement: e.statement,
    debt: Number(e.debt),
    receivable: Number(e.receivable),
    net: Number(e.debt) - Number(e.receivable),
    runningNet: Number(e.runningNet),
  }));

  return {
    openingNet: Number(raw.openingNet),
    entries,
    totalDebt: Number(raw.totalDebt),
    totalReceivable: Number(raw.totalReceivable),
    closingNet: Number(raw.closingNet),
  };
}
