# Changelog

All notable changes to Money Flow will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added (2026-05-05 — Phase 2 Upgrades)
- **Unified Portfolio page** (`/investments/portfolio`): cross-category view showing INR + USD hero cards, allocation pie chart by invested amount, and category breakdown table with per-row P&L — linked from Investments hub via "Portfolio View →" button
- **Expense Search** (`/search`, `⌘F`): live debounced full-text search with tag, date-range, and amount-range filters; shows result count, total sum, and "View →" links back to month; backend `GET /expenses/search` endpoint with ILIKE + dynamic WHERE clauses (LIMIT 200)
- **Anomaly Detection** on Overview: backend `GET /dashboard/anomalies` CTE query flags categories where current-month spend > 1.5× 3-month average; amber alert cards shown when anomalies exist
- **Toast / Undo system** (`src/components/Toast.tsx`): singleton imperative `showToast()` available from any page; progress-bar countdown, optional Undo button, × dismiss
- **Optimistic delete with Undo** on ExpensesMonth: row hidden immediately, 5-second timer before API call; Undo button restores row and cancels deletion
- **Code splitting**: all heavy pages (`Overview`, `ExpensesYear/Month`, `AccountsPage`, `AssetsPage`, `PlansPage`, `LifeXpPage`, `InvestmentsPage`, `PortfolioPage`, `FixedReturnsPage`, `SIPPage`, `RecurringDepositsPage`, `StocksPage`, `SearchPage`) loaded via `React.lazy()` + `Suspense`

### Added (2026-05-05 — Phase 1 Upgrades)
- **Global Quick-Add** (`⌘K` / `Ctrl+K` from any page): floating modal to add an expense without navigating to Daily page
- **Grouped sidebar navigation**: nav items now grouped into Money / Wealth / Life sections for reduced cognitive load
- **Net Worth Hero section** on Overview: large header showing total net worth, investment P&L, current month budget %, and liquid cash at a glance
- **Budget Forecast** on Daily page: shows projected month-end spend based on current daily average, with over/under budget colour coding
- **Net Worth Over Time chart** on Overview: area chart built from account + asset history snapshots
- **`GET /dashboard/net-worth-history`** backend endpoint: CTE query aggregating latest account_history + asset_history per month
- **TanStack Query v5**: QueryClientProvider wrapping the app, 2-minute stale time, background refetch on window focus
- **Zustand v5 store** (`src/store/appStore.ts`): persisted theme, badge counts, global quick-add open state — replaces localStorage + window event pattern

### Changed
- MainLayout badge polling migrated from `setInterval` + `window.dispatchEvent` to TanStack Query (refetch every 5 min + on window focus)
- Theme state managed by Zustand with `persist` middleware instead of direct localStorage reads in useEffect
- Quick-add button (`+ Add Expense`) now lives in the sidebar header for persistent access
- Overview now shows Net Worth hero above the year navigation and summary tiles

### Fixed
- **PlansPage `Mark Paid` bug**: `updatePlan` was called without `plan.name` as the second argument, silently sending `cover_amount` as the name field
- **export.ts**: 60+ TypeScript `number not assignable to string` errors — all `aoa_to_sheet` data arrays now typed as `Row[]`
- **export.ts**: removed unused type imports (`Tag`, `SpecialTag`, `MonthlyAggregate`, `Account`, `Asset`, `Plan`, `LifeXpBucket`, `FixedReturn`, `SIP`, `RecurringDeposit`, `Stock`)
- **import.ts**: removed unused `fetchTags` and `fetchSpecialTags` imports
- **ExpensesMonth.tsx**: suppressed unused `editTagId` state variable warning
- **LifeXpGuide.tsx**: removed unused `useState` import
- **PlanHistoryGraph.tsx**: suppressed unused `name` formatter parameter

### Added
- Budget year and month views with navigation
- Expense editing with tag and special tag support
- Expense date editing capability
- Expense deletion by month selection (year view)
- Activity logs for Accounts, Assets, and Life XP pages
- Editable names/titles for Life XP buckets, Assets, and Insurance plans
- SIP total units inline editing
- SIP investment type selection (SIP or Lumpsum) with invested amount
- Stocks invested value and current value fields (replaces buy price calculation)
- Stocks current price editing for Indian stocks
- Overview page USD invested amount display
- Expense distribution by category chart with month filtering
- Insurance plan total premium paid graph
- Insurance plan total premium paid display on tiles
- Insurance expired plan deletion functionality
- Clean expenses utility script for data management

### Changed
- Budget page restructured into year overview and month detail views
- Expense edit form now includes category tag and special tags selection
- Insurance graph now shows cumulative total premium paid instead of cover/premium
- Stocks form simplified to invested value, units, and current value
- SIP create form includes invested amount and investment type selection
- Currency formatting now always shows 2 decimal places
- Overview page spending trend chart replaced with expense distribution by category
- Plan history graph updated to show cumulative premium payments

### Fixed
- Mark Paid button now correctly creates plan history entries
- Date inputs allow direct typing (not just calendar picker)
- Asset page notes display now shows full text (multi-line support)
- Currency decimal display fixed (always shows 2 decimal places)

### Planned
- Multi-user authentication
- Mobile responsive design
- PDF export functionality
- Data import from CSV
- Recurring expense templates

## [1.0.0] - 2024-01-XX

### Added
- Expense tracking with date, amount, description, and tags
- Monthly budget setting and tracking
- Budget progress bar with visual indicators (green/yellow/red)
- Expense history by year and month
- Category-based expense analysis
- Accounts management (liquid money tracking)
- Assets tracking with value history
- Investments tracking (stocks, mutual funds, etc.)
- Plans management (insurance, subscriptions) with premium alerts
- Life Experiences (guilt-free spending buckets)
- Tags and special tags system
- Dark mode support
- CSV export for accounts, assets, and plans
- Balance history graphs for accounts and assets
- Premium due alerts for plans
- Plan expiry warnings
- Overview dashboard with financial snapshot

### Technical
- React 19 with TypeScript frontend
- Express.js with TypeScript backend
- PostgreSQL database
- RESTful API architecture
- Glassmorphism UI design
- CSS Variables for theming

---

## Version History

- **1.0.0**: Initial release with core features

---

## How to Read This Changelog

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Features that will be removed
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security updates

---

For detailed feature descriptions, see [USER_GUIDE.md](USER_GUIDE.md).
