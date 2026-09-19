# Stationery Handover Documents

Add a complete stationery handover process while keeping the existing stock-in/out workflow.

## What will change

- Move **Stationery** to the bottom of the main menu, after Reports.
- Add a **New Handover** action for issuing several stationery items together.
- The handover form will include date, reference, remarks, **Handover By**, **Handover To**, and repeatable item/quantity rows.
- Validate every quantity against available stock before saving, then save all handover items together as stock-out records.
- Add **Download** and **Print** controls in the empty Actions area of Stock Records.
- Keep a handover linked as one document, so opening any row from that handover prints/downloads every item in it.

## Handover document

Create a clean A4 handover document with:

- GHOUSH - Stock Management heading
- Handover number, date, and reference
- Item table with SL, item code, description, quantity, and UOM
- Remarks
- Signature section at the bottom for **Handover By** and **Handover To**
- Direct browser printing and PDF download

Existing individual stock records will also be printable; missing handover names will appear as blank signature lines.

## Technical details

- Add handover number and party-name fields to stationery transactions, protected by the existing approved-user access rules.
- Add a batch stock-out mutation so multi-item handovers remain grouped after refresh.
- Add a stationery handover PDF utility and connect it to record-row actions.
- Preserve existing stock calculations, low-stock alerts, searches, and Excel exports.
- Verify single-item and multi-item output, stock deduction, grouping, print/download controls, and desktop/mobile layout.
