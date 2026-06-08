## Goal
When a saved Request (Raw Material / General Supplies / Material Return) is loaded for editing and re-submitted, the Doc ID (e.g. `RMR-2026-0007`) must stay the same instead of getting a brand-new number.

## Problem
In `src/pages/Requests.tsx` (line ~428) the submit handler tries to recover the existing doc number by looking it up in the local Zustand store:

```ts
const existingRequest = isEditing ? submittedRequests.find(r => r.id === editingRequestId) : null;
const docNumber = existingRequest?.docNumber || getNextDocNumber(...);
```

But when the user clicks Edit from the **Records** tab or the **History** tab, `editingRequestId` is the **cloud row id** (`request.id` from Supabase), which does not exist in the local store. The lookup returns `undefined`, so `getNextDocNumber` fires and a fresh ID is allocated. The cloud row then gets overwritten with the new `request_no`, so the original ID is lost.

## Fix
Carry the original doc number into the edit session and reuse it on save.

### Files to edit
1. **`src/pages/Requests.tsx`**
   - Add state: `const [editingDocNumber, setEditingDocNumber] = useState<string | null>(null);`
   - In the `onEdit` callbacks for both `RequestHistoryTable` and `RecordsAnalytics`, call `setEditingDocNumber(request.docNumber)` alongside `setEditingRequestId(...)`.
   - In `handleSubmit` (around line 429), replace the lookup with:
     ```ts
     const docNumber = (isEditing && editingDocNumber)
       ? editingDocNumber
       : getNextDocNumber(type === 'raw' ? 'RMR' : type === 'general' ? 'GSR' : 'MRS');
     ```
   - After a successful save / on reset / on tab change, clear it: `setEditingDocNumber(null)`.

2. **`src/components/requests/RecordsAnalytics.tsx`**
   - Ensure the Edit action (if it triggers editing of a submitted request) forwards `docNumber` in its `onEdit` payload, same shape as `RequestHistoryTable.handleEdit` (which already does).

### Behaviour after fix
- Editing a request from Records or History → Save: same Doc ID, cloud row updated in place (`useUpdateCloudRequest` already updates by `requestId` and writes `request_no` unchanged).
- Creating a brand-new request: still gets a fresh sequential ID via `getNextDocNumber`.
- PDF re-downloads of saved requests already pass `request.request_no` as `existingDocNumber`, so they continue to show the original ID.

## Out of scope
- Delivery Notes module (no change requested).
- Local counter logic in `docNumberGenerator.ts` (unchanged).
- Any schema or RLS changes.
