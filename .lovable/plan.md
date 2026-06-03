## Goal
When a request is edited, the records UI should show both the original request date/submission and the latest updated date — only on screen, not in PDFs or delivery notes.

## Changes (UI only — `src/components/requests/RequestHistoryTable.tsx`)

1. **Records table** (Requests → Records tab):
   - Rename existing "Submitted" column to "Submitted / Updated".
   - In each row cell, show two stacked lines:
     - Line 1: `submitted_at` formatted as `dd/MM/yyyy HH:mm` (label: "Sub:")
     - Line 2: `updated_at` formatted the same way (label: "Upd:") — only rendered when `updated_at` exists and differs from `submitted_at` by more than a few seconds; otherwise show a single line as today.
   - Use `text-xs` and `text-muted-foreground` for the second line so the row stays compact.

2. **View Details dialog** (the modal opened by the eye icon):
   - Add a small "Last updated: dd/MM/yyyy HH:mm" line under the submitted timestamp when `updated_at` differs from `submitted_at`.

## Out of scope
- No changes to `src/lib/requestPdfExport.ts`, delivery-note PDFs, or Excel export — printed documents keep showing only the original request/submitted date as today.
- No schema changes (Supabase `requests.updated_at` already exists and is bumped on edit by `useUpdateCloudRequest`).
- No changes to business logic, mutations, or sorting.

## Technical notes
- Reuse existing `format` from `date-fns` already imported.
- Diff check: `Math.abs(new Date(updated_at).getTime() - new Date(submitted_at).getTime()) > 60_000`.
