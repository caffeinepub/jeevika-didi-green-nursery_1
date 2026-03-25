# Jeevika Didi Green Nursery

## Current State
App has two billing systems:
1. **खाता बही** — uses `KBTransaction[]` stored in `nursery_khata_transactions`. Has multi-plant items per bill, free-text block/panchayat, location cards grouped by block/panchayat, customer breakdown, search, edit, delete, print.
2. **स्मार्ट बिलिंग** — uses `SmartBill[]` stored in `jeevika_secure_billing`. Has single material/rate/qty per bill, tabular view, advanced filters, transport charge, vendor, financial year.

## Requested Changes (Diff)

### Add
- New state variables for Smart Billing system that mirror the खाता बही state (prefix `sb2`): `sb2Transactions`, `sb2PlantList`, `sb2FormBlock`, `sb2FormPanchayat`, `sb2FormCustomer`, `sb2FormBillNo`, `sb2FormBillDate`, `sb2FormWorkCode`, `sb2FormPaymentDate`, `sb2FormPrsName`, `sb2FormMobile`, `sb2FormItems`, `sb2SearchBlock`, `sb2SearchPanchayat`, `sb2SearchCustomer`, `sb2EditModal`, `sb2EditId`, `sb2EditBlock`, `sb2EditPanchayat`, `sb2EditCustomer`, `sb2EditBillNo`, `sb2EditBillDate`, `sb2EditWorkCode`, `sb2EditPaymentDate`, `sb2EditPrsName`, `sb2EditMobile`, `sb2EditItems`.
- `sb2Transactions` uses `KBTransaction` type, stored in localStorage key `smart_billing_khata` (new key to avoid conflict with old SmartBill format)
- `sb2PlantList` initialized with same `KB_PLANT_LIST_DEFAULT`

### Modify
- `renderLedger()` — replace the entire Smart Billing tabular UI with the exact same UI as `renderKhataBahi()`, but:
  - Uses `sb2*` state variables instead of `kb*` state variables
  - Title: `📒 स्मार्ट बिलिंग — ब्लॉक/पंचायत वार खाता`
  - Section header text: `🧾 स्मार्ट बिलिंग सिस्टम` (navigation label stays the same)
  - data-ocid prefix: `smartBilling` instead of `khataBahi`
  - datalist IDs use `sb2-` prefix to avoid conflicts with खाता बही datalists
  - Print template header says "स्मार्ट बिलिंग सिस्टम" instead of just nursery name header
  - Logout button text stays same
  - Everything else (form fields, location cards, search, edit modal, print) is identical to खाता बही

### Remove
- All old Smart Billing state variables that are no longer needed: `smartBills`, `editingSmartBill`, `sbBlock`, `sbPanchayat`, `sbBillNumber`, `sbMaterial`, `sbVendor`, `sbRate`, `sbQty`, `sbTransport`, `sbPaid`, `sbDate`, `sbFinYear`, `filterBlock`, `filterPanchayat`, `filterBillNo`, `filterMaterial`, `filterYear`, `filterPayment`, `globalFinancialYear`
- `SmartBill` interface
- `PANCHAYAT_MAP` constant
- `generateBillNumber`, `computeAmount`, `computePending`, `generatePrintHTML` functions (only used by old Smart Billing)
- `STORAGE_KEY` constant (was `jeevika_secure_billing`)

## Implementation Plan
1. Read current App.tsx fully
2. Remove old Smart Billing code (state, types, helper functions)
3. Add sb2 state variables (same structure as kb state)
4. Replace renderLedger() with a copy of renderKhataBahi() using sb2 state
5. Update localStorage save/load for sb2 data using key `smart_billing_khata`
6. Validate and build
