# Add Reports Page

## What Changes

1. **New "Reports" page** (`/reports`) added to the sidebar navigation between Delivery Notes and Account section
2. **Monthly Report section moves** from Dashboard to the new Reports page (email + Excel + PDF buttons)
3. **Custom Item Search Report** added — search for any item by description and see total quantities requested, issued, and returned across all requests

## Report Page Layout

```text
┌──────────────────────────────────────────┐
│  Reports                                 │
│                                          │
│  ┌─ Monthly Summary Report ────────────┐ │
│  │  [Month] [Year] [Excel] [PDF] [Email]│ │
│  └─────────────────────────────────────┘ │
│                                          │
│  ┌─ Custom Item Report ────────────────┐ │
│  │  Search: [_______________] [Search] │ │
│  │                                      │ │
│  │  Item: "Zipper"                      │ │
│  │  ┌──────────────────────────────────┐│ │
│  │  │ Date  │ Req# │ Type │ Qty │ Iss ││ │
│  │  │ 01/03 │ RM-5 │ Raw  │ 100 │  80 ││ │
│  │  │ 15/03 │ MR-2 │ Ret  │  20 │  20 ││ │
│  │  ├──────────────────────────────────┤│ │
│  │  │ TOTAL:  Requested: 120  Issued: 100│
│  │  └──────────────────────────────────┘│ │
│  └─────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

## Custom Item Report Details

- Search box with autocomplete from `request_items.description`
- Query all `request_items` matching that description (case-insensitive)
- Join with `requests` table to get request number, date, and type (RM/GS/MR)
- Show each transaction row with: date, request number, type (Raw Material / General / Return), color, size, requested qty, issued qty
- Summary totals at the bottom showing total requested and total issued per category

## Implementation Steps

1. **Create `src/pages/Reports.tsx**` — new page with MainLayout, containing the MonthlyReport component and a new CustomItemReport component
2. **Create `src/components/reports/CustomItemReport.tsx**` — search input, query `request_items` joined with `requests`, display results table with totals
3. **Update Sidebar** — add Reports nav item with a report icon
4. **Update App.tsx** — add `/reports` route
5. **Update Dashboard** — remove the MonthlyReport component from Dashboard

## Technical Details 

- Custom item search queries `request_items` with `ilike` filter on `description`, then fetches related `requests` by `request_id`
- Request type derived from `request_no` prefix: RM = Raw Material, GS = General Supplies, MR = Material Return
- No new database tables needed — reads existing `request_items` and `requests` tables

**with order number  also**