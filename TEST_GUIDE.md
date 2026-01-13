# Money Flow App - Test Guide

This guide helps you test various features of the Money Flow app.

## Getting Started

```bash
./start.sh
```
Then open http://localhost:5173

---

## 1. Accounts Page (`/accounts`)

### Sample Data Added:
| Account | Balance | Notes |
|---------|---------|-------|
| HDFC Savings | 1,25,000 | Primary savings account |
| ICICI Current | 45,000 | Business transactions |
| SBI FD | 2,00,000 | Fixed deposit - 7.5% interest |

### Test Scenarios:

1. **View Net Liquidity**: Header shows total of all account balances
2. **Click Account Card**: Opens modal with:
   - Current balance editor
   - Notes with multi-line support
   - Update button (also adds to history)
   - Delete option
3. **Show Trends**: Click to see balance history graph
4. **Add Entry**: Manually add historical balance entry
5. **Bulk Edit**: Edit multiple history entries at once
6. **CSV Import/Export**:
   - Format: `Date,Balance,Notes` (YYYY-MM-DD)
   - Example: `2024-01-15,125000,Salary credited`
7. **Click Graph Point**: Edit that specific history entry

---

## 2. Assets Page (`/assets`)

### Sample Data Added:
| Asset | Value | Notes |
|-------|-------|-------|
| Gold Jewelry | 3,50,000 | Family gold - 50 grams |
| Car - Honda City | 8,00,000 | 2022 model |
| Laptop MacBook | 1,20,000 | M2 Pro 14 inch |

### Test Scenarios:
- Same features as Accounts
- History tracking for value changes
- Graph shows value over time

---

## 3. Investments Page (`/investments`)

### Sample Data Added:
| Investment | Value | Notes |
|------------|-------|-------|
| MF - HDFC Flexi Cap | 1,50,000 | SIP since 2022 |
| Stocks - Reliance | 75,000 | 100 shares |
| PPF Account | 5,00,000 | Matures in 2030 |

### Test Scenarios:
- Same UI as Assets page
- Filter by type "investment"

---

## 4. Plans Page (`/plans`) - **NEW FEATURES**

### Sample Data Added:
| Plan | Cover | Premium | Frequency | Expiry | Next Premium |
|------|-------|---------|-----------|--------|--------------|
| LIC Term Plan | 50L | 12,000 | Yearly | Mar 2025 | Jan 15, 2025 |
| Star Health Insurance | 10L | 18,000 | Yearly | Feb 2025 | Jan 12, 2025 |
| HDFC Life Sanchay | 25L | 5,000 | Monthly | Jun 2035 | Jan 20, 2025 |
| Car Insurance | 50K | 8,500 | Yearly | Dec 2024 | Jan 5, 2025 |
| Home Insurance | 30L | 3,500 | Yearly | Aug 2025 | Aug 10, 2025 |

### Test Scenarios:

#### A. Alert Bars (Top of Page)
1. **Premium Due Alert** (Purple bar with pulsing dot):
   - Shows plans where premium is due within 15 days
   - Shows "OVERDUE" in red if premium date has passed
   - Click plan to update after payment

2. **Expiring Soon Alert** (Yellow bar):
   - Shows plans expiring within 60 days
   - Shows "EXPIRED" in red if already expired

#### B. Visual Indicators on Cards
1. **Red Dot** (top-right of card): Action needed - premium overdue or due soon
2. **Left Border Colors**:
   - Red = Plan expired
   - Yellow = Expiring within 60 days
3. **Badge** (top-right):
   - "EXPIRED" (red) if expired
   - "Xd left" (yellow) if expiring soon

#### C. Header Stats
- **Total Cover**: Sum of all cover amounts (green)
- **Annual Premium**: Calculated yearly total (yellow)
  - Monthly x 12
  - Quarterly x 4
  - Half-yearly x 2
  - Yearly x 1
- **Red Badge**: Count of plans needing action

#### D. Plan Card Display
- Cover amount (large, green)
- Premium amount with frequency (e.g., "5,000/month")
- Next premium date with status
- Expiry date (if not expired/expiring soon)

#### E. Edit Modal
- Update cover, premium, frequency
- **Expiry Date**: When plan ends
- **Next Premium Date**: When to pay next
  - Shows "OVERDUE!" or "Due Soon" labels
  - Update this after each payment

#### F. Premium Due Workflow
1. User pays premium (offline)
2. Opens app, sees red dot on plan
3. Clicks plan card
4. Updates "Next Premium Date" to next due date
5. Clicks "Update"
6. Red dot disappears

---

## 5. Testing Premium Due Scenarios

### Scenario 1: Premium Overdue
- Car Insurance has next_premium_date = Jan 5, 2025
- If today is after Jan 5, shows:
  - Red "OVERDUE" alert bar
  - Red dot on card
  - "Premium overdue by X days!" on card

### Scenario 2: Premium Due Soon
- LIC Term Plan has next_premium_date = Jan 15, 2025
- If within 15 days, shows:
  - Purple alert bar
  - Purple dot on card
  - "Premium due in X days" on card

### Scenario 3: Plan Expiring Soon
- Star Health Insurance expires Feb 10, 2025
- Shows:
  - Yellow "expiring soon" bar
  - Yellow left border
  - Yellow "Xd left" badge

### Scenario 4: Plan Expired
- Car Insurance expired Dec 25, 2024
- Shows:
  - Red "expired" bar
  - Red left border
  - Red "EXPIRED" badge

---

## 6. Quick Test Checklist

- [ ] Accounts: Add, edit, delete account
- [ ] Accounts: View/edit history, click graph point
- [ ] Assets: Add, edit, delete asset
- [ ] Assets: Show Trends graph
- [ ] Plans: See alert bars (premium due, expiring soon)
- [ ] Plans: See red dots on cards needing action
- [ ] Plans: Update premium date after payment
- [ ] Plans: See total cover and annual premium
- [ ] Plans: Add new plan with all fields
- [ ] Plans: View history graph with dual lines (cover + premium)

---

## 7. CSV Format Reference

### Accounts/Assets History:
```csv
Date,Balance,Notes
2024-01-01,100000,Opening balance
2024-02-01,105000,Interest added
```

### Plans History:
```csv
Date,Cover,Premium,Notes
2024-01-01,5000000,12000,Initial entry
2025-01-01,5000000,13000,Premium increased
```

---

## Troubleshooting

**Backend not running?**
```bash
cd backend && npm run dev
```

**Frontend not running?**
```bash
cd frontend && npm run dev
```

**Database issues?**
```bash
psql -U raviraj -d finance_app -f backend/database/schema.sql
```
