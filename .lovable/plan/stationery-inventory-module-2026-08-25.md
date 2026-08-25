# Stationery Inventory Module

A new separate **Stationery** section in the sidebar to track stationery stock: stock-in (receiving), stock-out (delivery/issue), live balances with low-stock alerts, and Excel downloads.

## What you'll get

- **New sidebar item "Stationery"** (`/stationery`) — its own page, nothing else changes.
- **Stock board**: one row per stationery item showing Item Code, Description, UOM, Total In, Total Used (out), Balance, and Minimum Level. Rows at/below minimum level are highlighted red with a "Low Stock" badge.
- **Add Item** dialog: pick from the existing Item List (same autocomplete as Trim Chart — typing an item code auto-fills the description), set an opening stock and a minimum level for the alert.
- **Stock In / Stock Out** buttons on each row: date, quantity (decimals allowed), reference (e.g. TR no / note), remarks. Every entry is saved as a permanent transaction record.
- **Records view**: full in/out history per item, newest first, with multi-word case-insensitive search (same as request history).
- **Excel downloads**:
  - *Stock Summary* — current balance of every item (with low-stock flagged).
  - *Transaction History* — all stock in/out records (like the accessories/request history export).

## How it works

### Database (2 new tables)
1. **`stationery_items`** — item code, description, UOM, opening stock, minimum level (alert threshold).
2. **`stationery_transactions`** — linked to an item; each row is one movement: type (IN or OUT), quantity, date, reference, remarks. Deleting an item removes its history automatically.

Balance = opening stock + total IN − total OUT, always computed from the records so it can never drift.

Both tables get the same protection as your existing data: only approved, signed-in users can read or write; nothing is publicly reachable.

### Frontend
- `src/pages/Stationery.tsx` — stock board + records, following the same look as Item List / Requests (spacious rows, same cards/tables).
- `src/hooks/useStationery.ts` — cloud queries/mutations with the existing caching setup; deletes update the screen immediately.
- `src/lib/stationeryExcel.ts` — the two Excel exports using the existing `xlsx` library.
- Sidebar gets a "Stationery" entry (box icon) between Item List and Trim Chart.

### Behavior rules (matching your existing conventions)
- Gapless SL No on the stock board; sorted by item order then date.
- Quantities accept decimals (5.20, 2.60 etc.).
- No changes to Requests, Delivery Notes, or the request PDF documents.

## Steps
1. Database migration: create the two tables with access rules.
2. Build the Stationery page (stock board, add/edit item, stock in/out dialogs, records list).
3. Wire the Excel exports.
4. Add sidebar entry + route, verify in preview (add item → stock in → stock out → low-stock highlight → downloads).
