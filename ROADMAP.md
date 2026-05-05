# Roadmap - Upcoming Features

This document outlines planned features and improvements for Money Flow.

---

## ✅ Completed

### Phase 1 — Foundation (2026-05-05)
- ✅ **TanStack Query v5** — caching, background refresh, deduplication of API calls
- ✅ **Zustand v5** — global state for theme, notifications, quick-add panel
- ✅ **Global Quick-Add** (`⌘K`) — add expenses from any page without navigation
- ✅ **Grouped sidebar navigation** — Money / Wealth / Life grouping
- ✅ **Net Worth Hero** — prominent current net worth, P&L, budget status on Overview
- ✅ **Budget Forecast** — "at current pace you'll spend X by month end" on Daily page
- ✅ **Net Worth History chart** — area chart from account + asset snapshots
- ✅ **`GET /dashboard/net-worth-history`** backend endpoint

---

## 🔜 Next Up (Phase 2 — UX Power-Ups)

### Unified Investment Portfolio View
- Single page showing: total invested, current value, overall P&L, allocation donut chart
- Breaks down by SIP / FD / RD / Indian Stocks / US Stocks / Crypto
- Currently requires visiting 4+ separate pages to see full picture

### Expense Search
- Full-text search across all expense statements
- Filter by date range, tag, special tag, amount range
- Results link back to the month view
- New backend endpoint: `GET /expenses/search?q=&tag=&from=&to=`

### Anomaly Detection (Spending Alerts)
- Flag categories where current month spend > 1.5× 3-month average
- Show inline on Overview dashboard
- New backend endpoint: `GET /dashboard/anomalies`

### Undo on Delete
- 5-second toast with undo for expense / asset / account deletion
- Prevents accidental data loss without confirmation dialogs

---

## 📋 Medium Priority (Phase 3 — Intelligence)

### SIP XIRR Calculator
- Compute actual annualised return from `sip_transactions` history
- Show alongside `returns_percent` (which is simple gain, not XIRR)

### Category Trends
- Year-over-year and month-over-month comparison per tag
- "Food spend is down 18% vs last year"

### Plan Renewal Summary
- "3 plans renewing in next 90 days, total premium ₹X" on Overview
- Aggregated view instead of per-plan badge

### Savings Rate Tracker
- (Income − Expenses) / Income shown as a trend line
- Requires adding optional monthly income field to budgets

---

## 🔭 Future Considerations (Phase 4+)

### Mobile PWA
- `manifest.json` + service worker
- Offline expense entry (sync when back online)
- Install prompt on mobile

### AI Expense Categorisation
- Auto-tag expenses using Claude API based on statement text
- Runs on blur from statement field, user confirms or overrides

### Bank Statement Import
- PDF/CSV parser for common Indian bank statement formats
- Preview + confirm before importing

### Multi-User Support
- User authentication (JWT or session)
- Data isolation per user
- Shared expense pools (for households)

### Recurring Expense Detection
- "You've paid ₹999 to Netflix 8 months in a row — add as recurring?"
- Pattern detection from expense history

### Code-Splitting / Performance
- `React.lazy()` for heavy pages (Overview, SIPPage, InvestmentsPage)
- Reduces initial JS bundle from 1.5MB to ~400KB first load

---

## Contributing Ideas

Have a feature idea? Open an issue on GitHub with the `enhancement` label.

---

**Note**: This roadmap reflects current priorities. Order may change based on usage feedback.
