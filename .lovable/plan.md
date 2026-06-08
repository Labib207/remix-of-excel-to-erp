## Goal
Balance column in Delivery Notes (UI form + PDF + totals) should always be blank — never computed by the platform.

## Changes

### `src/pages/DeliveryNotes.tsx`
- In `updateItem` (line ~210), remove the auto-recalculation: do not set `updated.balance`.
- In the items table row (line ~651-654), render an empty cell (or a plain editable input bound to `item.balance` with empty default) instead of the calculated Badge.
- Make the Balance cell editable so user can type a value if needed (kept blank by default).
- Totals row (line ~686): show empty for Balance total, or sum only if all rows have values. Simplest: leave Balance total blank.
- PDF payload (line ~295): pass `balance` as-is (user-entered or undefined), not the computed one.

### `src/lib/requestPdfExport.ts`
- Update `DeliveryItem.balance` type to `number | undefined | null` (line 582).
- In the row rendering (line 809) print `''` when balance is null/undefined/0 — i.e. always blank unless explicitly provided.
- Totals row (line 826): leave the Balance total cell blank.

## Out of scope
- Requirement Qty and Issued Qty auto-fill behavior unchanged.
- No schema changes.
