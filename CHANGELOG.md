# Changelog

All notable changes to Money Flow will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added (2026-05-24 — FlowCraft Goals + Theme Facelift)
- **Tiny goals** (`flowcraft_goals` table): three calm goal kinds — *skip a category*, *cap a category*, *N quiet days* — one active per week. Holding a goal grants a +3 garden bonus (atomic, idempotent). Missing it closes silently with no shame copy.
- **Goal endpoints** (`/flowcraft/goals/{active,POST,DELETE :id}`): zod-validated discriminated union; creating a new goal auto-cancels any prior active goal for the same week.
- **GoalCard + GoalPicker** on `/flow`: empty state shows a "Pick a goal" CTA; active state shows headline + progress bar + display + cancel. Bar tint follows status (ochre active, sage held, dusk-pink missed). Picker is a glass modal with kind-picker → kind-specific form, inline validation in dusk-pink (no alerts).
- **Overview FlowCraft widget**: collapsible soft tile at the top of `/overview` ("Want a small goal this week?") that links to `/flow`. Auto-hides when an active goal exists; dismissible for 48 h via localStorage.
- **Three new calm insights**:
  - *Quietly bigger* — category whose last 30 d ran >25% above prior 30 d (and ≥ ₹200 absolute). Past-tense, "noted, not alarming".
  - *Heavier weekdays* — heaviest weekday's daily average vs. true overall daily average (>30%). Pure observation, no prescription.
  - *Goal held* — compassionate celebration when this week's goal is held; notes when the garden bonus was just applied.
- **Conditional prompts on expense entry**: above ₹100 (non-fuel) the form softly invites mood chips + a note; above ₹250 (non-fuel) or above ₹1,500 (fuel) a note becomes required. Mood chips reuse the seeded `mood:*` special tags, tinted from a small desaturated per-mood palette.
- **Quick-Add modal**: overlay now scrolls so the Save button stays reachable on short windows / mobile.
- **Garden**: removed the "sapling / sprouted / leafy / blooming" variant labels — the plant visual carries progression on its own. Display is now just "day N".
- **`.claude/agents/`**: adds **validator** (haiku, typecheck + smoke-test runner), **investments** (sonnet, read-only observer over SIPs/FDs/RDs/stocks; explicit hard rule against buy/sell/hold advice), and **auditor** (opus, diligent code+design reviewer covering correctness, security, type safety, calm-design adherence, accessibility, performance, tests, docs, migration safety). All read-only.
- **Backend dep**: adds **zod** for runtime input validation at HTTP trust boundaries (used first by the goals endpoints).

### Changed (2026-05-24 — Tea Ceremony palette)
- App-wide theme refresh: replaces Slate/indigo with a calm warm palette so the whole app feels like one product (the FlowCraft layer already used these tones; everything else now matches).
  - Light: warm cream bg (`#FAF7F2`), deep ink text (`#2E2A26`), mushroom secondary (`#7A6F66`).
  - Dark: warm coffee bg (`#1F1B18`), warm cream text (`#F0EAE0`), warm grey secondary (`#A89E92`).
  - `--accent-primary` = muted ochre (`#C9A66B`) in both themes.
  - `--accent-success` = sage; `--accent-warning` = dusk-pink (replaces amber); `--accent-danger` = deep clay (replaces bright red).
- Token names preserved — every component using `var(--accent-*)` picks up new values automatically. Biggest behavioral shift: red retired across the app (over-budget bars, expired-plan badges, "delete" buttons all render in clay or dusk-pink). Chart colors (Recharts hardcoded hex) are unchanged; revisit if any look mismatched.

### Fixed (2026-05-24 — Auditor pass on goals backend)
- `evaluateGoal` short-circuits when `target_tag_id` is null (skip/cap kinds). Previously, a deleted tag would null the FK, the SQL match returned 0, and at week-end the goal silently auto-held — granting a free +3 garden bonus.
- `applyHeldBonus` rewritten as a single CTE statement: the flag flip and garden bump now happen atomically. A process crash mid-flight can no longer leave `bonus_applied = TRUE` without the garden actually growing.
- `mondayOf` is now IST-aware. Previously, requests between Mon 00:00–05:30 IST bucketed into the previous week because `mondayOf` used UTC while `expenses.date` is server-local IST.
- `flowcraft.controller.getInsights` wraps each side effect (`waterIfDue`, `syncActiveGoalForUser`) in its own try/catch. Transient pool errors during the side-effect path no longer 500 the insights endpoint.
- `heavier-weekdays` now computes the true overall daily average from per-day totals (in the same CTE) instead of averaging the 7 weekday means. Removes the bias that over-weighted sparse weekdays.

### Added (2026-05-21 — FlowCraft Calm Layer)
- **Brand identity**: Ripple logo (`frontend/public/logo.svg`) and Coin the cat mascot (`mascot.svg`) — soft pastel SVGs replacing the default Vite favicon, scalable across favicon (32 px) → app header → PWA icon size
- **`/flow` page**: a calm weekly view with a Garden tile (monotonic growth, never wilts, never penalises), Coin in a glass panel with optional weekly observation, and a stream of insight cards in three tones (calm / gentle-attention / compassionate)
- **Pluggable InsightEngine** (`backend/src/modules/flowcraft/engine.ts`): interface + default `RuleBasedEngine`; each insight is a single-file builder under `insights/`, ready to be swapped or augmented by an AI engine later without touching callers
- **Five calm insights**: *Freely yours this week* (safe-to-spend math from monthly budget), *Same as usual* (reassurance when weekly coefficient-of-variation < 18%), *You already won this week* (no-spend or notably quiet day in past 7d), *Looks recurring* (≥3 stable-amount repeats over 120d), *Journal nudge* (gentle invite when an expense was tagged `mood:*`)
- **Garden growth** in new `flowcraft_state` table: monotonic +1 per day with any logged expense, capped at 30, transitions `sapling → sprouted → leafy → blooming`. Skipping days does nothing — never wilts.
- **Journal** (new `flowcraft_journal` table): optional, skippable 500-char entries linked to an expense or a week, with prompt + mood + answer
- **Recurring detection** (new `flowcraft_recurring` table): user can confirm or dismiss; dismissed candidates never resurface in insights
- **Mood/context tags** seeded into existing `special_tags`: `mood:stress`, `mood:joy`, `mood:social`, `mood:convenience`, `mood:health`, `mood:impulse` — feed the journal-nudge insight
- **API endpoints**: `GET /flowcraft/insights`, `GET /flowcraft/state`, `POST /flowcraft/recurring/confirm`, `POST /flowcraft/recurring/dismiss`, `GET /flowcraft/journal`, `POST /flowcraft/journal`
- **Sidebar entry**: `Flow` under the Money group, between Add expense and Search; sidebar header now shows the Ripple logo next to "MoneyFlow"
- **Project-scoped Coach agent** (`.claude/agents/coach.md`): a haiku-model subagent that answers basic orientation questions in plain language. Read-only — explains, never edits. Available to anyone who clones the repo.

### Design constraints (FlowCraft)
The layer deliberately departs from common gamified-finance UI patterns. These are hard rules, not preferences:
- **No XP, no streaks, no daily nudges, no red anywhere.** XP creates performance pressure; streak counters panic on breakage; red triggers threat response. The garden is the only visible progression metric, and it's monotonic — over-budget weeks do not slow growth.
- **Insight tone is part of the data model** (`InsightTone`: `calm` | `gentle-attention` | `compassionate`). Tinted card backgrounds map directly. Adding a new tone is a single type change.
- **Copy rules**: past-tense and factual when summarizing ("Friday passed quiet"), tentative when suggesting ("you could mark this recurring"). Forbidden words: *must, should, broken, critical, urgent, warning, failed*.
- **Animation**: ease-out 200–300 ms, no springs, no bounce. Toasts cap at 2 stacked, 4 s.

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
