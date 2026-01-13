# Utils Scripts

Utility scripts for managing the Money Flow application.

## Clean Data Script

This script allows you to clean data from multiple tables:
- **Expenses**: Can be filtered by date (specific date, month, or year)
- **Accounts**: All data is deleted (including account_history)
- **Assets**: All data is deleted (including asset_history)
- **Plans/Insurances**: All data is deleted (including plan_history)

**Note**: All other data (budgets, tags, special_tags, etc.) remains intact.

### Usage

From the `backend` directory:

```bash
cd backend
npm run clean-expenses -- [options]
```

**Note:** The `--` is required to pass arguments to the script through npm.

### Options (for expenses only)

Date filtering only applies to expenses. Accounts, assets, and plans are always deleted completely.

- `--date YYYY-MM-DD` - Delete expenses for a specific date
  - Example: `npm run clean-expenses -- --date 2024-01-15`

- `--month YYYY-MM` - Delete expenses for a whole month
  - Example: `npm run clean-expenses -- --month 2024-01`

- `--year YYYY` - Delete expenses for a whole year
  - Example: `npm run clean-expenses -- --year 2024`

- No arguments - Delete all expenses, accounts, assets, and plans
  - Example: `npm run clean-expenses --`

### Examples

```bash
# Delete expenses for January 15, 2024 (and all accounts, assets, plans)
npm run clean-expenses -- --date 2024-01-15

# Delete all expenses in January 2024 (and all accounts, assets, plans)
npm run clean-expenses -- --month 2024-01

# Delete all expenses in 2024 (and all accounts, assets, plans)
npm run clean-expenses -- --year 2024

# Delete all expenses, accounts, assets, and plans
npm run clean-expenses --
```

### Notes

- The script will show how many records match the criteria before deleting
- Date filtering only applies to expenses
- Accounts, assets, and plans are always deleted completely (all data)
- All other data (budgets, tags, special_tags, etc.) remains untouched
- Related history tables (account_history, asset_history, plan_history) are also deleted
