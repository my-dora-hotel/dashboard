-- Report data via RPC: all aggregation in DB, minimal data transfer
-- ================================================================

-- 1) Account Statement: opening net + period entries with running balance
CREATE OR REPLACE FUNCTION get_account_statement(
  p_account_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_opening_net DOUBLE PRECISION;
  v_entries JSONB;
  v_total_debt DOUBLE PRECISION;
  v_total_receivable DOUBLE PRECISION;
  v_closing_net DOUBLE PRECISION;
BEGIN
  -- Opening net: sum(debt) - sum(receivable) for date < p_start_date
  SELECT COALESCE(SUM(debt), 0) - COALESCE(SUM(receivable), 0)
  INTO v_opening_net
  FROM ledger_entries
  WHERE account_id = p_account_id AND date < p_start_date;

  v_opening_net := COALESCE(v_opening_net, 0);

  -- Period entries with running_net (window function)
  WITH period AS (
    SELECT
      id,
      date,
      created_at,
      statement,
      COALESCE(debt, 0)::DOUBLE PRECISION AS debt,
      COALESCE(receivable, 0)::DOUBLE PRECISION AS receivable,
      (COALESCE(debt, 0) - COALESCE(receivable, 0))::DOUBLE PRECISION AS net
    FROM ledger_entries
    WHERE account_id = p_account_id
      AND date >= p_start_date
      AND date <= p_end_date
  ),
  with_running AS (
    SELECT
      id,
      date,
      statement,
      debt,
      receivable,
      v_opening_net + SUM(net) OVER (ORDER BY date, created_at ROWS UNBOUNDED PRECEDING) AS running_net
    FROM period
  )
  SELECT
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'date', date,
        'statement', statement,
        'debt', debt,
        'receivable', receivable,
        'runningNet', running_net
      )
      ORDER BY date, id
    ),
    COALESCE(SUM(debt), 0),
    COALESCE(SUM(receivable), 0)
  INTO v_entries, v_total_debt, v_total_receivable
  FROM with_running;

  v_entries := COALESCE(v_entries, '[]'::jsonb);
  v_total_debt := COALESCE(v_total_debt, 0);
  v_total_receivable := COALESCE(v_total_receivable, 0);
  v_closing_net := v_opening_net + (
    SELECT COALESCE(SUM(COALESCE(debt, 0) - COALESCE(receivable, 0)), 0)
    FROM ledger_entries
    WHERE account_id = p_account_id AND date >= p_start_date AND date <= p_end_date
  );

  RETURN jsonb_build_object(
    'openingNet', v_opening_net,
    'entries', v_entries,
    'totalDebt', v_total_debt,
    'totalReceivable', v_total_receivable,
    'closingNet', v_closing_net
  );
END;
$$;

-- 2) Account Summary: aggregated by account, grouped by category
CREATE OR REPLACE FUNCTION get_account_summary(
  p_start_date DATE,
  p_end_date DATE,
  p_category_id TEXT DEFAULT NULL,
  p_filter_option TEXT DEFAULT 'all'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_result JSONB;
BEGIN
  WITH agg AS (
    SELECT
      l.account_id,
      a.name AS account_name,
      a.category_id,
      c.name AS category_name,
      c.id AS category_id_str,
      COALESCE(SUM(l.debt), 0)::DOUBLE PRECISION AS total_debt,
      COALESCE(SUM(l.receivable), 0)::DOUBLE PRECISION AS total_receivable,
      (COALESCE(SUM(l.debt), 0) - COALESCE(SUM(l.receivable), 0))::DOUBLE PRECISION AS net,
      COUNT(*)::INT AS entry_count
    FROM ledger_entries l
    JOIN accounts a ON a.id = l.account_id
    JOIN categories c ON c.id = a.category_id
    WHERE l.date >= p_start_date AND l.date <= p_end_date
      AND (p_category_id IS NULL OR a.category_id = p_category_id)
    GROUP BY l.account_id, a.id, a.name, a.category_id, c.id, c.name
  ),
  filtered AS (
    SELECT *
    FROM agg
    WHERE (p_filter_option = 'all')
      OR (p_filter_option = 'onlyDebtBalance' AND net > 0)
      OR (p_filter_option = 'onlyReceivableBalance' AND net < 0)
      OR (p_filter_option = 'onlyActive' AND entry_count > 0)
  ),
  by_category AS (
    SELECT
      category_id_str,
      category_name,
      jsonb_agg(
        jsonb_build_object(
          'account', jsonb_build_object(
            'id', account_id,
            'name', account_name,
            'category_id', category_id_str,
            'categories', jsonb_build_object('id', category_id_str, 'name', category_name)
          ),
          'totalDebt', total_debt,
          'totalReceivable', total_receivable,
          'net', net,
          'entryCount', entry_count
        )
        ORDER BY account_name
      ) AS accounts,
      SUM(total_debt) AS group_total_debt,
      SUM(total_receivable) AS group_total_receivable,
      SUM(net) AS group_net
    FROM filtered
    GROUP BY category_id_str, category_name
  ),
  groups_json AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'category', jsonb_build_object('id', category_id_str, 'name', category_name),
        'accounts', accounts,
        'totalDebt', group_total_debt,
        'totalReceivable', group_total_receivable,
        'net', group_net
      )
      ORDER BY category_id_str
    ) AS j
    FROM by_category
  ),
  totals AS (
    SELECT
      COALESCE(SUM(group_total_debt), 0) AS total_debt,
      COALESCE(SUM(group_total_receivable), 0) AS total_receivable,
      COALESCE(SUM(group_net), 0) AS total_net
    FROM by_category
  )
  SELECT jsonb_build_object(
    'groups', COALESCE((SELECT j FROM groups_json), '[]'::jsonb),
    'totalDebt', (SELECT total_debt FROM totals),
    'totalReceivable', (SELECT total_receivable FROM totals),
    'totalNet', (SELECT total_net FROM totals)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

-- Allow authenticated users to call these functions
GRANT EXECUTE ON FUNCTION get_account_statement(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_account_summary(DATE, DATE, TEXT, TEXT) TO authenticated;
