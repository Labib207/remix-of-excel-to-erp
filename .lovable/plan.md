## Goal
Every request defaults to **Pending**. In Reports → Records tab, user can approve a row by entering a TR/PL number. Without a valid TR/PL number, the row stays pending. Pending rows show a red badge; approved rows show a green badge with the TR/PL number. Requests page and PDFs are not changed.

## Database (migration)
Add to `public.requests`:
- `approval_status` text NOT NULL DEFAULT `'pending'` (values: `pending`, `approved`)
- `tr_number` text NULL
- `approved_at` timestamptz NULL
- `approved_by` uuid NULL

Existing rows backfill to `pending`. No uniqueness on `tr_number` (repeats allowed). RLS already exists on `requests`; reuse current policies — authenticated users can update.

## Reports → Records tab (`src/components/requests/RecordsAnalytics.tsx`)
- New **Status** column showing:
  - Red `Pending` badge when `approval_status = 'pending'`
  - Green badge showing the `tr_number` (e.g. `TR-08754`) when approved
- **Approve** action button on each pending row → opens a dialog with one input "TR / PL Number".
  - Validation: must match regex `/^(TR|PL)-.+/i` (case-insensitive, requires `TR-` or `PL-` prefix + at least one more character). Empty or wrong-prefix value blocks submit with inline error.
  - On submit: update the request row with `approval_status='approved'`, `tr_number`, `approved_at=now()`, `approved_by=auth.uid()`. Toast success. Refresh query.
- Approved rows: **no** revoke/edit action (final).
- Add **status filter** dropdown above the records table: `All` / `Pending` / `Approved` — filters the displayed list client-side.
- Optional row tint: pending rows get a subtle red-tinted background using a semantic token (`bg-destructive/5`) so they stand out when scrolling search results.

## Imported / external records
Historical Excel-imported records also start as `pending` (default applies). User must enter TR/PL to mark approved — no auto-approval.

## Hooks
- Extend `src/hooks/useRequests.ts` (and `useLocalRequests.ts` if used by Records) — `Request` type adds the four new fields; add a small `useApproveRequest` mutation that calls update with the four fields and invalidates `['requests']`.

## Out of scope
- Requests page UI, request creation flow, request PDF, delivery notes, dashboard — unchanged.
- No revoke/unapprove flow.
- No uniqueness check on TR numbers.
- No changes to monthly Excel export columns (can be revisited later if you want TR included in the export).
