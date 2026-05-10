## Goal

Update the **Custom Item Report** (Reports page) so the user can search by **Order** alone, and the results only show **actually requested items** — no requirements, no other sources.

## Changes to `src/components/reports/CustomItemReport.tsx`

### 1. Search by Order (without item description)

- Make item description **optional** when an Order is selected.
- Add a dedicated **"Search by Order"** action: if the user picks an order from the dropdown and clicks Search (or a new "Load Order Items" button), fetch every `request_items` row belonging to that order's requests — no description filter required.
- Current behavior (description + optional order) still works.
- Disable the Search button only when BOTH the description is empty AND no order is selected.

### 2. Show only requested items (drop requirements/garbage)

- Remove the `requirements` table query entirely from `handleSearch`.
- Only pull from `request_items` joined to `requests` → `orders`.
- Remove the **Source** column and the **Requirement** badge type from the table and Excel export.
- Keep columns: Date, Request #, Order #, Type (Raw Material / General Supplies / Material Return), Item Code, Description, Color, Size, Unit, **Requested Qty**, Issued Qty.
- Add **Item Code** and **Description** columns (currently missing) so the user can see exactly which item was requested.
- Category totals (the bottom summary cards) drop the "Requirement" category automatically since it no longer exists.

### 3. UI tweaks

- Update the helper text under the card title from "Search any item to see all request, requirement & issue history" → **"Search by item or order to see only requested quantities"**.
- Update the empty-state message to handle both "no item searched" and "order has no requested items".

## Out of scope

- No database/schema changes.
- No changes to other reports, PDF export, or other pages.
- Monthly Summary Report is untouched.