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
│   │   ├── App.tsx              # Root component
│   │   ├── pages/               # Page components
│   │   │   ├── Daily.tsx        # Homepage (expense entry)
│   │   │   ├── Overview.tsx     # Dashboard
│   │   │   ├── expenses/
│   │   │   ├── budget/
│   │   │   └── ...
│   │   ├── components/          # Reusable components
│   │   ├── layouts/             # Layout components
│   │   └── lib/                 # Utilities
│   │       ├── api.ts           # API client
│   │       ├── format.ts        # Formatting helpers
│   │       └── settings.ts      # App settings
│   └── package.json
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
- **State**: Component-level state (no global state management)
- **Styling**: CSS with CSS Variables for theming

### Data Flow

```
User Action → React Component → API Client → Express Route → Controller → Repository → Database
                                                                    ↓
User sees result ← React Component ← API Response ← JSON Response
```

## Code Organization

### Backend Modules

Each feature module follows this pattern:

```
module-name/
├── module-name.routes.ts    # Route definitions
├── module-name.controller.ts # Request/response handling
└── module-name.repo.ts      # Database queries
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

### Frontend Pages

Each page:
- Fetches its own data
- Manages its own state
- Uses shared components from `/components`
- Calls API via `/lib/api.ts`

**Example**:
```typescript
// pages/Daily.tsx
function Daily() {
  const [expenses, setExpenses] = useState([]);
  
  useEffect(() => {
    api.getExpenses().then(setExpenses);
  }, []);
  
  return <ExpenseForm onSubmit={handleSubmit} />;
}
```

## Database Schema

Key tables:
- `expenses` - Expense records
- `monthly_budgets` - Monthly budget limits
- `tags` - Expense categories
- `special_tags` - Additional tags (many-to-many)
- `accounts` - Liquid money accounts
- `assets` - Owned assets
- `investments` - Investment holdings
- `plans` - Insurance/commitments
- `life_xp` - Experience buckets

See `backend/database/schema.sql` for full schema.

## API Endpoints

### Expenses
- `GET /expenses` - List expenses (with year/month filters)
- `POST /expenses` - Create expense
- `PUT /expenses/:id` - Update expense
- `DELETE /expenses/:id` - Delete expense

### Budgets
- `GET /budgets` - List budgets
- `POST /budgets` - Create/update budget
- `GET /budgets/:year/:month` - Get specific month budget

### Resources (Accounts, Assets, etc.)
- `GET /resources` - List all resources
- `POST /resources` - Create resource
- `PUT /resources/:id` - Update resource
- `DELETE /resources/:id` - Delete resource

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
