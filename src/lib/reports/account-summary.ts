import { createClient } from "@/lib/supabase/client";
import type { AccountWithCategory, Category } from "@/types/database";
import type { AccountSummaryParameters } from "@/types/reports";

export interface AccountSummaryRow {
  account: AccountWithCategory;
  totalDebt: number;
  totalReceivable: number;
  /** net = totalDebt - totalReceivable. Positive = Borç Bakiye, Negative = Alacak Bakiye */
  net: number;
  entryCount: number;
}

export interface AccountSummaryGroup {
  category: Category;
  accounts: AccountSummaryRow[];
  totalDebt: number;
  totalReceivable: number;
  net: number;
}

export interface AccountSummaryData {
  groups: AccountSummaryGroup[];
  totalDebt: number;
  totalReceivable: number;
  totalNet: number;
}

/** RPC response shape from get_account_summary */
interface AccountSummaryRpcAccount {
  account: {
    id: string;
    name: string;
    category_id: string;
    categories: { id: string; name: string };
  };
  totalDebt: number;
  totalReceivable: number;
  net: number;
  entryCount: number;
}

interface AccountSummaryRpcGroup {
  category: { id: string; name: string };
  accounts: AccountSummaryRpcAccount[];
  totalDebt: number;
  totalReceivable: number;
  net: number;
}

/**
 * Fetch account summary via DB RPC. Grouping and aggregation are done
 * in PostgreSQL; only the result set is transferred.
 */
export async function fetchAccountSummary(
  parameters: AccountSummaryParameters
): Promise<AccountSummaryData> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_account_summary", {
    p_start_date: parameters.startDate,
    p_end_date: parameters.endDate,
    p_category_id: parameters.categoryId ?? null,
    p_filter_option: parameters.filterOption,
  });

  if (error) {
    throw new Error(`Failed to fetch account summary: ${error.message}`);
  }

  const raw = data as unknown as {
    groups: AccountSummaryRpcGroup[];
    totalDebt: number;
    totalReceivable: number;
    totalNet: number;
  };

  const groups: AccountSummaryGroup[] = (raw.groups || []).map((g) => {
    const category: Category = {
      id: g.category.id,
      name: g.category.name,
      entry_type: "both",
      advance_period_days: null,
      created_at: "",
      updated_at: "",
    };
    const accounts: AccountSummaryRow[] = (g.accounts || []).map((a) => ({
      account: {
        id: a.account.id,
        name: a.account.name,
        category_id: a.account.category_id,
        description: null,
        created_at: "",
        updated_at: "",
        categories: category,
      } as AccountWithCategory,
      totalDebt: Number(a.totalDebt),
      totalReceivable: Number(a.totalReceivable),
      net: Number(a.net),
      entryCount: Number(a.entryCount),
    }));
    return {
      category,
      accounts,
      totalDebt: Number(g.totalDebt),
      totalReceivable: Number(g.totalReceivable),
      net: Number(g.net),
    };
  });

  return {
    groups,
    totalDebt: Number(raw.totalDebt),
    totalReceivable: Number(raw.totalReceivable),
    totalNet: Number(raw.totalNet),
  };
}
