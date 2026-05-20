# Lock Description fields to Item List only

## Goal

Change the Description field in Trim Chart, Requests, and Delivery Notes from a free-text autocomplete into a **searchable dropdown** that only accepts items already in the Item List. If the item the user needs is not there, they must add it from the Item List page first — no inline "Add to catalog" button anymore.

## Behavior

- Click the Description field → a searchable dropdown opens showing all items from the Item List.
- Type to filter by description or item code.
- Only values that exist in the Item List can be selected.
- Selecting an item auto-fills Description, Item Code, and UOM (same as today).
- If no match is found, show an empty state: *"Item not found. Add it in Item List first."* with a link/button to open the Item List page.
- No free typing is committed to the field — the value always corresponds to a catalog entry.

## Where it applies

- Trim Chart edit row (`src/components/requests/RequirementsTab.tsx`)
- Requests material-return edit row (`src/pages/Requests.tsx`)
- Delivery Notes item edit row (`src/pages/DeliveryNotes.tsx`)

## Technical details

- Rewrite `src/components/requests/DescriptionAutocomplete.tsx` to use shadcn `Popover` + `Command` (combobox pattern) instead of the current `Input` + custom suggestion list.
- Remove the inline "Add to catalog" button and the `useCreateCatalogItem` call from this component.
- Keep the `onSelect(material)` contract identical so the three call sites need no changes.
- Empty-state inside the popover shows a `Link` to `/items`.
- Existing rows that already contain a description not in the catalog still display their text (read-only fallback) but cannot be re-selected until added to the Item List.  
  
NOTE: IS IT POSSIBLE TO ADD BOX NOT DROP DOWN . THEN IF I SEARCH ANY WORD ITS TAKE FROM THE ITEM LIST OR IF I ENTER ITEM CODE ITS SHOW ME THE EXACT ITEM.