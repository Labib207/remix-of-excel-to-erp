

## Increase Cell Spacing in Material Sheet Table

A small styling adjustment to add a bit more vertical padding to the table cells in the Request items table (the "Raw Material Sheet" on the Requests page).

### What will change

- Increase the vertical padding on `TableCell` elements in the items table from the default `p-4` to a slightly larger value (`py-3`) -- just enough to give a comfortable gap between rows without making the table feel oversized.
- This will apply only to the material sheet table in the Requests page, not globally.

### Technical Details

**File: `src/pages/Requests.tsx`** (lines ~574-650, the items table body)
- Add a className like `py-3` to each `TableCell` in the items map, or wrap the `TableBody` rows with slightly increased spacing.
- Alternatively, add a className to the `TableRow` to increase row height slightly (e.g., `className="h-14"` or similar).

The simplest approach: add `className="py-3"` to the `<TableRow>` elements inside the items table body, giving each row a subtle increase in vertical spacing.

