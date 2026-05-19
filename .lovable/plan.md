## Goal

Add a central **Item Master** (product list) module so descriptions are standardized across Trim Chart, Requests, and Delivery Notes — eliminating duplicates caused by typos or extra spaces.

## What you'll get

1. **New sidebar page: "Item List"** (placed before "Trim Chart")
  - Table of all items with columns: Item Code, Description, UOM, Category (optional), Actions
  - Add / Edit / Delete buttons
  - Search box to filter
  - Bulk import from Excel (optional, reuses existing import pattern)
2. **Strict autocomplete everywhere descriptions are typed**
  - Trim Chart (Requirements tab)
  - Request item rows
  - Delivery Note item rows
  - Dropdown suggests items from the master list as you type
  - Selecting fills Item Code + Description + UOM together
  - Option to "Add new item" inline if not found → opens a small dialog → saved to master → then inserted
  - Free-typed descriptions that don't match are normalized (trimmed, collapsed spaces) before save, so "ZIPPER  10cm" and "ZIPPER 10cm" become the same item
3. **Backend**
  - Use the existing `material_catalog` table (already in DB with `item_code`, `description`, `uom`). No schema change needed for v1.
  - Optional: add a `category` column later if you want grouping.

## Technical details

- New page `src/pages/ItemMaster.tsx` + route `/items` in `App.tsx`
- New sidebar link in `src/components/layout/Sidebar.tsx` (above Trim Chart)
- New hook `src/hooks/useMaterialCatalog.ts` (React Query CRUD against `material_catalog`)
- Refactor `DescriptionAutocomplete.tsx` to:
  - Source data from cloud `material_catalog` instead of local zustand store
  - Add "+ Add new item" footer row in the dropdown
  - Normalize text (`.trim().replace(/\s+/g, ' ')`) on blur/save
- Wire the autocomplete into Request item rows and Delivery item rows (currently only Trim Chart uses it)

## Out of scope (ask if you want them)

- Pricing / stock levels per item
- Supplier info
- Per-item images
- Item categories / grouping filters

## Questions before I build

1. Do you want **bulk Excel import** for the initial item list, or will you add items one-by-one?
2. Should non-admin users be able to **add new items**, or only view/select existing ones?
3. Any extra fields beyond **Item Code, Description, UOM** (e.g., Category, Color, Default Supplier)?