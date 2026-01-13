import { Pool } from "pg";

// Database connection (same as backend)
const pool = new Pool({
    host: "localhost",
    port: 5432,
    database: "finance_app",
    user: "raviraj",
    password: "",
});

pool.on("error", (err) => {
    console.error("Unexpected error on idle client", err);
    process.exit(-1);
});

interface DateFilter {
    type: 'date' | 'month' | 'year' | 'all';
    value?: string;
}

function parseArguments(): DateFilter {
    const args = process.argv.slice(2);
    
    // Check for --date YYYY-MM-DD
    const dateIndex = args.indexOf('--date');
    if (dateIndex !== -1 && args[dateIndex + 1]) {
        const dateStr = args[dateIndex + 1];
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return { type: 'date', value: dateStr };
        } else {
            console.error('Invalid date format. Use YYYY-MM-DD (e.g., 2024-01-15)');
            process.exit(1);
        }
    }
    
    // Check for --month YYYY-MM
    const monthIndex = args.indexOf('--month');
    if (monthIndex !== -1 && args[monthIndex + 1]) {
        const monthStr = args[monthIndex + 1];
        if (/^\d{4}-\d{2}$/.test(monthStr)) {
            return { type: 'month', value: monthStr };
        } else {
            console.error('Invalid month format. Use YYYY-MM (e.g., 2024-01)');
            process.exit(1);
        }
    }
    
    // Check for --year YYYY
    const yearIndex = args.indexOf('--year');
    if (yearIndex !== -1 && args[yearIndex + 1]) {
        const yearStr = args[yearIndex + 1];
        if (/^\d{4}$/.test(yearStr)) {
            return { type: 'year', value: yearStr };
        } else {
            console.error('Invalid year format. Use YYYY (e.g., 2024)');
            process.exit(1);
        }
    }
    
    // No arguments - show usage
    return { type: 'all' };
}

function buildWhereClause(filter: DateFilter): { query: string; params: any[] } {
    switch (filter.type) {
        case 'date':
            return {
                query: 'WHERE date = $1',
                params: [filter.value]
            };
        case 'month':
            // Match all dates in the given month
            return {
                query: 'WHERE date >= $1 AND date < $2',
                params: [
                    `${filter.value}-01`,
                    getNextMonth(filter.value!)
                ]
            };
        case 'year':
            // Match all dates in the given year
            return {
                query: 'WHERE date >= $1 AND date < $2',
                params: [
                    `${filter.value}-01-01`,
                    `${(parseInt(filter.value!) + 1).toString()}-01-01`
                ]
            };
        case 'all':
            return {
                query: '',
                params: []
            };
    }
}

function getNextMonth(monthStr: string): string {
    const [year, month] = monthStr.split('-').map(Number);
    let nextYear = year;
    let nextMonth = month + 1;
    
    if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
    }
    
    return `${nextYear.toString().padStart(4, '0')}-${nextMonth.toString().padStart(2, '0')}-01`;
}

function printUsage() {
    console.log('\nUsage: npm run clean-expenses [options]\n');
    console.log('This script deletes data from:');
    console.log('  - Expenses (with date filtering)');
    console.log('  - Accounts (all data)');
    console.log('  - Assets (all data)');
    console.log('  - Plans/Insurances (all data)\n');
    console.log('Options (for expenses only):');
    console.log('  --date YYYY-MM-DD    Delete expenses for a specific date (e.g., 2024-01-15)');
    console.log('  --month YYYY-MM      Delete expenses for a whole month (e.g., 2024-01)');
    console.log('  --year YYYY          Delete expenses for a whole year (e.g., 2024)');
    console.log('  (no args)            Delete all expenses, accounts, assets, and plans\n');
    console.log('Examples:');
    console.log('  npm run clean-expenses -- --date 2024-01-15');
    console.log('  npm run clean-expenses -- --month 2024-01');
    console.log('  npm run clean-expenses -- --year 2024');
    console.log('  npm run clean-expenses --              (deletes all)\n');
}

async function cleanExpenses(filter: DateFilter) {
    try {
        console.log('Starting data cleanup...\n');
        
        // 1. Clean Expenses (with date filtering)
        const { query: whereClause, params } = buildWhereClause(filter);
        
        // Get the expense IDs that match the filter
        const getExpenseIdsQuery = `SELECT id FROM expenses ${whereClause}`;
        const expenseIdsResult = await pool.query(getExpenseIdsQuery, params);
        const expenseIds = expenseIdsResult.rows.map(row => row.id);
        
        if (expenseIds.length > 0) {
            console.log(`Found ${expenseIds.length} expense(s) to delete.`);
            
            // Delete from expense_special_tags first (foreign key constraint)
            const placeholders = expenseIds.map((_, i) => `$${i + 1}`).join(',');
            await pool.query(
                `DELETE FROM expense_special_tags WHERE expense_id IN (${placeholders})`,
                expenseIds
            );
            console.log('✓ Cleared expense_special_tags');
            
            // Delete from expenses
            await pool.query(`DELETE FROM expenses ${whereClause}`, params);
            console.log('✓ Cleared expenses');
            
            // Get filter description for confirmation
            let filterDesc = '';
            switch (filter.type) {
                case 'date':
                    filterDesc = `for date ${filter.value}`;
                    break;
                case 'month':
                    filterDesc = `for month ${filter.value}`;
                    break;
                case 'year':
                    filterDesc = `for year ${filter.value}`;
                    break;
                case 'all':
                    filterDesc = 'all expenses';
                    break;
            }
            console.log(`  → Deleted ${expenseIds.length} expense(s) ${filterDesc}\n`);
        } else {
            console.log('No expenses found matching the criteria.\n');
        }
        
        // 2. Clean Accounts (all data)
        const accountsResult = await pool.query('SELECT COUNT(*) as count FROM accounts');
        const accountsCount = parseInt(accountsResult.rows[0].count);
        
        if (accountsCount > 0) {
            // Delete account_history first (foreign key constraint)
            await pool.query('TRUNCATE TABLE account_history CASCADE');
            console.log('✓ Cleared account_history');
            
            // Delete accounts
            await pool.query('TRUNCATE TABLE accounts CASCADE');
            console.log(`✓ Cleared accounts (${accountsCount} account(s) deleted)\n`);
        } else {
            console.log('No accounts found.\n');
        }
        
        // 3. Clean Assets (all data)
        const assetsResult = await pool.query('SELECT COUNT(*) as count FROM assets');
        const assetsCount = parseInt(assetsResult.rows[0].count);
        
        if (assetsCount > 0) {
            // Delete asset_history first (foreign key constraint)
            await pool.query('TRUNCATE TABLE asset_history CASCADE');
            console.log('✓ Cleared asset_history');
            
            // Delete assets
            await pool.query('TRUNCATE TABLE assets CASCADE');
            console.log(`✓ Cleared assets (${assetsCount} asset(s) deleted)\n`);
        } else {
            console.log('No assets found.\n');
        }
        
        // 4. Clean Plans/Insurances (all data)
        const plansResult = await pool.query('SELECT COUNT(*) as count FROM plans');
        const plansCount = parseInt(plansResult.rows[0].count);
        
        if (plansCount > 0) {
            // Delete plan_history first (foreign key constraint)
            await pool.query('TRUNCATE TABLE plan_history CASCADE');
            console.log('✓ Cleared plan_history');
            
            // Delete plans
            await pool.query('TRUNCATE TABLE plans CASCADE');
            console.log(`✓ Cleared plans/insurances (${plansCount} plan(s) deleted)\n`);
        } else {
            console.log('No plans/insurances found.\n');
        }
        
        // Reset sequences
        await pool.query('ALTER SEQUENCE IF EXISTS expenses_id_seq RESTART WITH 1');
        await pool.query('ALTER SEQUENCE IF EXISTS accounts_id_seq RESTART WITH 1');
        await pool.query('ALTER SEQUENCE IF EXISTS account_history_id_seq RESTART WITH 1');
        await pool.query('ALTER SEQUENCE IF EXISTS assets_id_seq RESTART WITH 1');
        await pool.query('ALTER SEQUENCE IF EXISTS asset_history_id_seq RESTART WITH 1');
        await pool.query('ALTER SEQUENCE IF EXISTS plans_id_seq RESTART WITH 1');
        await pool.query('ALTER SEQUENCE IF EXISTS plan_history_id_seq RESTART WITH 1');
        console.log('✓ Reset all sequences');
        
        console.log('\n✅ Data cleanup completed successfully!');
        
    } catch (err) {
        console.error("Error cleaning data:", err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Main execution
const filter = parseArguments();

if (filter.type === 'all') {
    // If no arguments, delete all expenses + accounts + assets + plans
    console.log('No date filter specified. Will delete all expenses, accounts, assets, and plans.\n');
    cleanExpenses(filter);
} else {
    // If date filter specified, only filter expenses, but still delete all accounts/assets/plans
    cleanExpenses(filter);
}
