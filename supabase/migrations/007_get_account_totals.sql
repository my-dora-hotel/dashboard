-- Alt Hesaplar sayfası: her hesap için toplam borç/alacak tek sorguda
CREATE OR REPLACE FUNCTION get_account_totals()
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'accountId', account_id,
        'totalDebt', total_debt,
        'totalReceivable', total_receivable
      )
    ),
    '[]'::jsonb
  )
  FROM (
    SELECT
      account_id,
      COALESCE(SUM(debt), 0)::DOUBLE PRECISION AS total_debt,
      COALESCE(SUM(receivable), 0)::DOUBLE PRECISION AS total_receivable
    FROM ledger_entries
    GROUP BY account_id
  ) AS agg;
$$;

GRANT EXECUTE ON FUNCTION get_account_totals() TO authenticated;
