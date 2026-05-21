# Developer Guide

This guide helps developers set up, understand, and contribute to Money Flow.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Architecture Overview](#architecture-overview)
- [Code Organization](#code-organization)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Contributing](#contributing)

## Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** 12+ (running locally or remote)
- **Git** for version control
- Basic knowledge of:
  - TypeScript/JavaScript
  - React
  - REST APIs
  - SQL

## Development Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd money_flow

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb finance_app

# Or using psql
psql -U your_username -c "CREATE DATABASE finance_app;"

# Apply schema
cd backend
npm run setup-db
```

**Note**: The database schema includes dummy/sample data for demonstration. You can clear this data to start fresh, or use it to explore the application features.

### 3. Configuration

**Backend** (`backend/src/core/db.ts`):
- Update database connection settings if needed
- Default: `localhost:5432`, database: `finance_app`

**Frontend** (`frontend/src/lib/api.ts`):
- API base URL defaults to `http://localhost:3000`
- Update if backend runs on different port

### 4. Run Development Servers

**Option 1: Quick Start Script**
```bash
./start.sh
```

**Option 2: Manual**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

- Backend: http://localhost:3000
- Frontend: http://localhost:5173

## Project Structure

```
money_flow/
├── backend/
│   ├── src/
│   │   ├── app.ts              # Express app setup
│   │   ├── server.ts            # Entry point
│   │   ├── core/
│   │   │   ├── db.ts            # Database connection
│   │   │   └── userContext.ts  # User context (currently "default")
│   │   ├── modules/             # Feature modules
│   │   │   ├── expenses/
│   │   │   │   ├── expenses.routes.ts
│   │   │   │   ├── expenses.controller.ts
│   │   │   │   └── expenses.repo.ts
│   │   │   ├── budgets/
│   │   │   ├── resources/
│   │   │   └── tags/
│   │   └── types/
│   ├── database/
│   │   └── schema.sql           # Database schema
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx             # React entry point
│   │   ├── App.tsx              # Root component with routing
│   │   ├── pages/               # Page components
│   │   │   ├── Daily.tsx        # Homepage (expense entry)
│   │   │   ├── Overview.tsx     # Dashboard with charts
│   │   │   ├── expenses/        # Expense pages
│   │   │   │   ├── ExpensesYear.tsx    # Year overview
│   │   │   │   └── ExpensesMonth.tsx  # Month detail
│   │   │   ├── budget/          # Budget pages
│   │   │   │   ├── BudgetOverview.tsx # Redirect to current year
│   │   │   │   ├── BudgetYear.tsx     # Year overview
│   │   │   │   └── BudgetMonth.tsx    # Month detail
│   │   │   └── ...              # Other pages
│   │   ├── components/          # Reusable components
│   │   │   └── PlanHistoryGraph.tsx   # Plan history chart
│   │   ├── layouts/             # Layout components
│   │   └── lib/                 # Utilities
│   │       ├── api.ts           # API client
│   │       ├── format.ts        # Formatting helpers
│   │       └── settings.ts      # App settings
│   └── package.json
│
├── utils/                       # Utility scripts
│   ├── clean_expenses.ts        # Data cleanup utility
│   └── README.md                # Utility documentation
│
└── start.sh                     # Development startup script
```

## Architecture Overview

### Backend

- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with raw SQL queries
- **Pattern**: Modular structure (routes → controller → repository)
- **Authentication**: Currently single-user ("default"), ready for multi-user

### Frontend

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v7
- **Server State**: TanStack Query v5 — caching, background refresh, window-focus refetch
- **Global UI State**: Zustand v5 — theme, notification badge counts, quick-add modal open/close
- **Styling**: CSS with CSS Variables for theming (glassmorphism)

### State Layers

| Layer | Library | What lives here |
|-------|---------|----------------|
| Server data | TanStack Query | API responses — cached, background-refreshed |
| Global UI | Zustand (`src/store/appStore.ts`) | Theme, badge counts, quick-add open state |
| Local component | React `useState` | Form values, loading booleans, UI-only toggles |

### Data Flow

```
User Action → React Component
                 ├── TanStack Query (useQuery / useMutation) → API Client → Express → DB
                 └── Zustand store (read/write for UI state)
```

## Code Organization

### Backend Modules

Each feature module follows this pattern:

```
module-name/
├── module-name.routes.ts     # Route definitions
├── module-name.controller.ts # Request/response handling
└── module-name.repo.ts       # Database queries
```

**Example - Expenses Module**:

```typescript
// expenses.routes.ts
router.get("/", controller.listExpenses);
router.post("/", controller.createExpense);

// expenses.controller.ts
export async function listExpenses(req: Request, res: Response) {
  const userId = getUserId();
  const data = await repo.list(userId, req.query);
  res.json(data);
}

// expenses.repo.ts
export async function list(userId: string, filters: any) {
  const result = await pool.query("SELECT ...", [userId]);
  return result.rows;
}
```

### Frontend Pages & Store

Each page fetches its own data via TanStack Query hooks. Cross-page UI state goes through Zustand.

**Page example**:
```typescript
// pages/Daily.tsx — fetches own data, reads nothing from global store
function Daily() {
  const { data: expenses } = useQuery({
    queryKey: ['expenses', year, month],
    queryFn: () => fetchExpenses(year, month),
  });
  return <ExpenseForm onSubmit={handleSubmit} />;
}
```

**Global state example**:
```typescript
// Any component — open the quick-add modal
import { useAppStore } from '../store/appStore';
const { openQuickAdd } = useAppStore();
<button onClick={openQuickAdd}>+ Add</button>
```

### Frontend Folder Structure

```
frontend/src/
├── store/
│   └── appStore.ts       # Zustand store (theme, badges, quick-add)
├── components/
│   ├── QuickAddModal.tsx  # Global ⌘K expense entry modal
│   ├── ExpenseForm.tsx    # Shared expense creation form
│   └── ...
├── layouts/
│   └── MainLayout.tsx     # Sidebar, theme toggle, TanStack Query badge polling
├── lib/
│   ├── api.ts             # All fetch functions + TypeScript interfaces
│   ├── format.ts          # Currency formatting
│   └── ...
└── pages/
    ├── Overview.tsx       # Dashboard: net worth hero, charts, heatmaps
    ├── Daily.tsx          # Expense entry + budget forecast
    └── ...
```

## Database Schema

Key tables:
- `expenses` - Expense records
- `monthly_budgets` - Monthly budget limits
- `tags` - Expense categories
- `special_tags` - Additional tags (many-to-many; also holds `mood:*` context tags)
- `accounts` - Liquid money accounts
- `assets` - Owned assets
- `investments` - Investment holdings
- `plans` - Insurance/commitments
- `life_xp_buckets` - Savings goal buckets (NOT gamification — naming predates FlowCraft)
- `flowcraft_state` - One row per user; garden stage, mascot mood
- `flowcraft_recurring` - Detected subscriptions/bills; user can confirm or dismiss
- `flowcraft_journal` - Optional one-line journal entries
- `flowcraft_insight_history` - Prevents the same insight from repeating daily

See `backend/database/schema.sql` for full schema. Migrations live under `backend/database/migrations/`.

## FlowCraft Layer

The FlowCraft layer (`/flow`) is a calm view bolted onto the existing finance app. It deliberately uses different design rules from the rest of the app (no red, no streaks, no nudges, monotonic progression only). All new tables are prefixed `flowcraft_*` to keep the boundary visible at the schema level.

### InsightEngine Interface

Insights are pluggable. The default `RuleBasedEngine` ships in the app; an AI engine could implement the same interface later without changing any callers.

```typescript
// backend/src/modules/flowcraft/engine.ts
export interface InsightEngine {
  generateInsights(ctx: InsightContext): Promise<Insight[]>;
}
```

Each insight lives in its own file under `backend/src/modules/flowcraft/insights/` and returns `Insight | null`. Adding one is two steps:

1. Create `insights/your-insight.ts` exporting `buildYourInsight(ctx): Promise<Insight | null>`.
2. Add it to the `builders` array in `rule-based.engine.ts`.

To swap to AI later, write `ai.engine.ts` implementing `InsightEngine` and switch the import in `flowcraft.controller.ts`. The frontend never knows the difference.

### Insight Tone System

Three tones map to three card tints in `InsightCard.tsx`:

| Tone               | Tint       | Use for                            |
|--------------------|------------|------------------------------------|
| `calm`             | sage       | reassurance, "same as usual"       |
| `gentle-attention` | ochre      | "looks recurring", soft prompts    |
| `compassionate`    | dusk-pink  | wins, journal nudges, kept-joy     |

### Garden Mechanic

`flowcraft_state.garden_stage` is **monotonic**. The only write path is `waterIfDue(userId)` in `flowcraft.repo.ts`, which increments by 1 if:
- the user has logged any expense today, AND
- `last_water` is null or before today.

It is called as a side-effect of `GET /flowcraft/insights`. Skipping a day = nothing happens. Over-budget = nothing happens. The plant only grows. There is intentionally no decay mechanic.

### Calm-design Hard Rules

- **No red, anywhere.** Use dusk-pink (`#E8B4B8`) for gentle attention.
- **No streaks visible.** Garden growth is the only persistent progress metric.
- **No auto-opening modals or push notifications.** User pulls; app does not push.
- **Copy**: past-tense and factual when summarizing ("Friday passed quiet"); tentative when suggesting ("you could mark this recurring"). Forbidden: *must, should, broken, critical, urgent, warning, failed*.
- **Animation**: ease-out 200–300 ms, no springs, no bounce. Toasts cap at 2 stacked, 4 s.

See `.claude/agents/coach.md` for the full tone guide — the Coach agent enforces these rules in its own output and is a useful reference.

## API Endpoints

### Expenses
- `GET /expenses` - List expenses (with year/month filters)
- `GET /expenses/:id/special-tags` - Get special tags for an expense
- `POST /expenses` - Create expense (with tag_id and special_tag_ids)
- `PUT /expenses/:id` - Update expense (supports tag_id, special_tag_ids, date)
- `DELETE /expenses/:id` - Delete expense
- `DELETE /expenses/year/:year/months` - Delete expenses by year and months array

### Budgets
- `GET /budgets/:year/:month` - Get specific month budget
- `POST /budgets` - Create/update budget
- `GET /budgets/summary/:year` - Get yearly budget summary

### Dashboard
- `GET /dashboard/summary` - Current month expenses + account/asset totals
- `GET /dashboard/net-worth-history` - Monthly net worth timeline from account + asset history snapshots

### Resources (Accounts, Assets, Plans, SIPs, Stocks)
- `GET /resources/*` - List resources by type
- `POST /resources/*` - Create resource
- `PUT /resources/*/:id` - Update resource (supports name editing for assets, plans, life_xp)
- `PUT /resources/sips/:id/units` - Update SIP total units
- `DELETE /resources/*/:id` - Delete resource

### FlowCraft
- `GET /flowcraft/insights` - Generate calm insights for today. Side-effect: waters the garden (+1 stage) if user logged an expense today and not yet watered.
- `GET /flowcraft/state` - Garden stage, mascot mood, last-water date
- `POST /flowcraft/recurring/confirm` - Confirm a detected recurring transaction; body: `{ signature, sample, amount, cadenceDays }`
- `POST /flowcraft/recurring/dismiss` - Dismiss a candidate so it never resurfaces; body: `{ signature }`
- `GET /flowcraft/journal` - List recent journal entries (limit 30)
- `POST /flowcraft/journal` - Add an entry; body: `{ answer, expenseId?, prompt?, mood? }` — answer max 500 chars

See individual route files in `backend/src/modules/` for complete API documentation.

## Development Workflow

### Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes**
   - Follow existing code patterns
   - Keep functions small and focused
   - Add comments for complex logic

3. **Test locally**
   - Run both backend and frontend
   - Test the feature manually
   - Check for console errors

4. **Commit**
   ```bash
   git add .
   git commit -m "Add: description of changes"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Code Style

- **TypeScript**: Use types, avoid `any` when possible
- **Naming**: camelCase for variables, PascalCase for components
- **Formatting**: Use consistent indentation (2 spaces)
- **Comments**: Explain "why", not "what"

### Common Tasks

**Add a new API endpoint**:
1. Add route in `module.routes.ts`
2. Add controller function in `module.controller.ts`
3. Add repository function in `module.repo.ts`
4. Test with Postman or curl

**Add a new page**:
1. Create component in `frontend/src/pages/`
2. Add route in `frontend/src/App.tsx`
3. Add navigation link if needed
4. Create API functions in `frontend/src/lib/api.ts`

**Modify database schema**:
1. Update `backend/database/schema.sql`
2. Run migration manually or update setup script
3. Update TypeScript types if needed

## Testing

See [TEST_GUIDE.md](TEST_GUIDE.md) for detailed testing scenarios.

**Quick test checklist**:
- [ ] Add expense
- [ ] View expenses by month
- [ ] Set budget
- [ ] Add account/asset
- [ ] Update resource values
- [ ] Export CSV

## Contributing

### Before Contributing

1. Check existing issues and PRs
2. Discuss major changes in an issue first
3. Follow the code style and patterns

### Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new features
3. **Update CHANGELOG.md** with your changes
4. **Ensure code builds** without errors
5. **Test manually** before submitting

### What to Contribute

- Bug fixes
- New features (discuss first)
- Documentation improvements
- Performance optimizations
- UI/UX improvements
- Test coverage

## Troubleshooting

**Backend won't start**:
- Check PostgreSQL is running: `pg_isready`
- Verify database exists: `psql -l | grep finance_app`
- Check port 3000 is free: `lsof -i :3000`

**Frontend won't start**:
- Clear node_modules: `rm -rf node_modules && npm install`
- Check port 5173 is free: `lsof -i :5173`

**Database connection errors**:
- Verify credentials in `backend/src/core/db.ts`
- Check PostgreSQL is accepting connections
- Ensure database exists

**Type errors**:
- Run `npm run build` to see all TypeScript errors
- Check type definitions in `backend/src/types/`

## Next Steps

- Read the code in `backend/src/modules/expenses/` for a complete example
- Check `frontend/src/pages/Daily.tsx` for a React page example
- Explore the API client in `frontend/src/lib/api.ts`

---

Questions? Open an issue or start a discussion on GitHub!
