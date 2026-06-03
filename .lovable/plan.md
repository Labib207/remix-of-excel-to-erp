## Goal
Requests marked as "Not Approved" must not appear anywhere in the Reports page (Custom Item Report table, totals, and Excel export).

## Current state
- `MonthlyReport.tsx` and `send-monthly-report` edge function already filter by `approval_status === 'approved'`.
- `CustomItemReport.tsx` does NOT — it pulls every `request_item` regardless of the parent request's approval status, which is why RMR-2026-0098 still appears.

## Change (single file: `src/components/reports/CustomItemReport.tsx`)
1. In the `handleSearch` Supabase select for `requests`, include `approval_status`:
   ```
   .select('id, request_no, request_date, order_id, approval_status')
   ```
2. When building `requestMap`, skip requests where `(r.approval_status || 'approved') !== 'approved'` so their items are dropped.
3. In the items loop, also drop any item whose `request_id` is not in `requestMap` (already true when an order filter is set — extend to always).

Result: Not Approved requests and their quantities disappear from the Custom Item Report rows, category totals, grand total, and the Excel export (which is generated from the same `results` array).

## Out of scope
No schema changes. No changes to Records/History tab, monthly Excel/PDF, or email report (already filtered).