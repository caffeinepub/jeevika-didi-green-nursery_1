# Jeevika Didi Green Nursery

## Current State
- Full website with sections: Home, Plants, Training, Certificate, Gallery, Location, Contact
- One `ledger` section (Smart Billing System) with login: `JEEVIKA DIDI GREEN NURSERY` / `Jeevika@123`
- Navigation has a single `📒 खाता बही` nav link pointing to `ledger`

## Requested Changes (Diff)

### Add
- New separate section `khataBahi` — the original simple खाता बही (Ledger) system
- Separate login for खाता बही: Username `jeevikadidigreennursery`, Password `Jeevika`
- Separate login state for खाता बही (independent from Smart Billing login)
- Navigation item `📒 खाता बही` → navigates to `khataBahi`
- Navigation item `🧾 स्मार्ट बिलिंग` → navigates to `ledger` (existing Smart Billing System)

### Modify
- Navigation: currently has one `📒 खाता बही` button; now needs TWO nav items: `📒 खाता बही` and `🧾 स्मार्ट बिलिंग`
- Login modal: must handle two separate logins — one for `khataBahi` and one for `ledger`, each with their own credentials and session state
- `renderLedger()` heading already says `स्मार्ट बिलिंग सिस्टम` — keep as-is
- `handleLogout()` for खाता बही logs out only from खाता बही (does not affect Smart Billing login state)

### Remove
- Nothing removed

## Implementation Plan

1. Add new state variables:
   - `isKhataLoggedIn: boolean` — separate from `isLoggedIn` (Smart Billing)
   - `showKhataLoginModal: boolean`
   - `khataLoginUsername/Password/Error` strings

2. Add `renderKhataBahi()` function:
   - Simple traditional खाता बही UI (classic ledger style, green color scheme)
   - Own localStorage key `jeevika_khata_bahi`
   - Fields: बिल नंबर, तिथि, ग्राहक का नाम, ब्लॉक, पंचायत, सामग्री, मात्रा, दर, राशि, भुगतान स्थिति
   - Block dropdown (same ALL_BLOCKS list), panchayat dropdown (same PANCHAYAT_MAP)
   - Add/Edit/Delete entries
   - Search by customer name / block / panchayat
   - Print button
   - Totals footer
   - Logout button that clears `isKhataLoggedIn` only

3. Update `navigate()` function:
   - `section === 'khataBahi'` → check `isKhataLoggedIn`, if not show khata login modal
   - `section === 'ledger'` → check `isLoggedIn`, if not show smart billing login modal (existing behavior)

4. Add `handleKhataLogin()` and `handleKhataLogout()` functions:
   - Credentials: `jeevikadidigreennursery` / `Jeevika`
   - On success: `setIsKhataLoggedIn(true)`, navigate to `khataBahi`

5. Update nav:
   - Add `{ id: 'khataBahi', label: '📒 खाता बही' }` to navItems
   - Change existing ledger nav label from `📒 खाता बही` to `🧾 स्मार्ट बिलिंग`
   - Both appear in desktop and mobile nav

6. Add login modal for खाता बही (similar style to existing Smart Billing login modal but separate)

7. Update `renderContent()` / section rendering to include `khataBahi` case
