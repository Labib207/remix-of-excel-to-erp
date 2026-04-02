

# Monthly Summary Report — Manual Generate & Download

## What You Get

A **"Monthly Report"** section on the Dashboard page with:
- A **month/year picker** to select any month
- A **"Generate Report"** button that creates a downloadable PDF
- The PDF contains a **category-wise breakdown** of all transactions for that month

## Report Contents (Category-wise)

1. **Orders** — Total orders created that month, listed with Order No, Customer, Style, Quantity, Status
2. **Requirements (Trim Chart)** — Total material items added, with Required Qty, Received Qty, Balance
3. **Raw Material Requests** — All requests with request number, date, item count, total quantities
4. **General Supplies Requests** — Same breakdown for general category
5. **Material Return Requests** — Same breakdown for returns
6. **Delivery Notes** — All delivery acknowledgments with issued quantities
7. **Summary Totals** — Grand totals for each category at the top of the report

## Implementation Steps

1. **Create `MonthlyReport` component** on the Dashboard page
   - Month/year selector (dropdown or date picker)
   - "Generate PDF" button
   - Queries cloud database for the selected month's data across all tables (orders, requirements, requests, request_items, delivery_acknowledgments, delivery_items)
   - Categorizes requests by type (Raw Material / General / Return) based on request_no prefix

2. **Create `monthlyReportPdf.ts`** utility
   - Uses `jspdf` + `jspdf-autotable` (already in project for other PDFs)
   - Landscape A4 format matching existing PDF standards
   - Sections for each category with tables and totals
   - Company header with Adeem Uniform branding

3. **Add to Dashboard page** — Place the Monthly Report card below the existing stats, before the Order-wise Material Status section

## Technical Details

- Data filtering by month uses `created_at` timestamps with date range queries
- Request categorization: `request_no` starting with "RM" = Raw Material, "GS" = General, "MR" = Return
- No new database tables needed — reads existing data only
- No new navigation items — lives on the Dashboard

