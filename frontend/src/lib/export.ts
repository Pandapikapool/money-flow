import * as XLSX from 'xlsx';
import {
    fetchExpenses, getYearSummary, getBudget,
    fetchTags, fetchSpecialTags, getExpenseSpecialTags,
    fetchAccounts, fetchAccountHistory,
    fetchAssets, fetchAssetHistory,
    fetchPlans, fetchPlanHistory,
    fetchLifeXpBuckets, fetchLifeXpHistory,
    fetchFixedReturns,
    fetchSIPs, fetchSIPTransactions,
    fetchRecurringDeposits,
    fetchStocks,
    type Expense, type Tag, type SpecialTag, type MonthlyAggregate,
    type Account, type AccountHistory,
    type Asset, type AssetHistory,
    type Plan, type PlanHistory,
    type LifeXpBucket, type LifeXpHistory,
    type FixedReturn,
    type SIP, type SIPTransaction,
    type RecurringDeposit,
    type Stock
} from './api';
// Note: Using raw numbers for Excel, not formatted currency

export async function exportYearData(year: number): Promise<void> {
    try {
        // Fetch all data for the year
        const [
            yearSummary,
            tags,
            specialTags,
            accounts,
            assets,
            plans,
            lifeXpBuckets,
            fixedReturns,
            sips,
            recurringDeposits,
            indianStocks,
            usStocks,
            cryptoStocks
        ] = await Promise.all([
            getYearSummary(year),
            fetchTags(),
            fetchSpecialTags(),
            fetchAccounts(),
            fetchAssets(),
            fetchPlans(),
            fetchLifeXpBuckets(),
            fetchFixedReturns(),
            fetchSIPs(),
            fetchRecurringDeposits(),
            fetchStocks('indian'),
            fetchStocks('us'),
            fetchStocks('crypto')
        ]);

        // Fetch expenses for all months
        const allExpenses: Expense[] = [];
        for (let month = 1; month <= 12; month++) {
            try {
                const expenses = await fetchExpenses(year, month);
                allExpenses.push(...expenses);
            } catch (err) {
                console.warn(`Failed to fetch expenses for ${year}-${month}:`, err);
            }
        }

        // Get special tags for expenses
        const expenseSpecialTagsMap: Record<number, number[]> = {};
        for (const expense of allExpenses) {
            try {
                const specialTagIds = await getExpenseSpecialTags(expense.id);
                expenseSpecialTagsMap[expense.id] = specialTagIds;
            } catch (err) {
                console.warn(`Failed to fetch special tags for expense ${expense.id}:`, err);
            }
        }

        // Fetch all history data
        const accountHistories: Record<number, AccountHistory[]> = {};
        for (const account of accounts) {
            try {
                accountHistories[account.id] = await fetchAccountHistory(account.id);
            } catch (err) {
                console.warn(`Failed to fetch history for account ${account.id}:`, err);
            }
        }

        const assetHistories: Record<number, AssetHistory[]> = {};
        for (const asset of assets) {
            try {
                assetHistories[asset.id] = await fetchAssetHistory(asset.id);
            } catch (err) {
                console.warn(`Failed to fetch history for asset ${asset.id}:`, err);
            }
        }

        const planHistories: Record<number, PlanHistory[]> = {};
        for (const plan of plans) {
            try {
                planHistories[plan.id] = await fetchPlanHistory(plan.id);
            } catch (err) {
                console.warn(`Failed to fetch history for plan ${plan.id}:`, err);
            }
        }

        const lifeXpHistories: Record<number, LifeXpHistory[]> = {};
        for (const bucket of lifeXpBuckets) {
            try {
                lifeXpHistories[bucket.id] = await fetchLifeXpHistory(bucket.id);
            } catch (err) {
                console.warn(`Failed to fetch history for life XP bucket ${bucket.id}:`, err);
            }
        }

        const sipTransactions: Record<number, SIPTransaction[]> = {};
        for (const sip of sips) {
            try {
                sipTransactions[sip.id] = await fetchSIPTransactions(sip.id);
            } catch (err) {
                console.warn(`Failed to fetch transactions for SIP ${sip.id}:`, err);
            }
        }

        // Fetch budgets for all months
        const budgets: Array<{ month: number; amount: number; notes?: string }> = [];
        for (let month = 1; month <= 12; month++) {
            try {
                const budget = await getBudget(year, month);
                budgets.push({ month, amount: budget.amount });
            } catch (err) {
                // Budget might not exist for this month
            }
        }

        // Create workbook
        const workbook = XLSX.utils.book_new();

        // Helper to create tag name lookup
        const tagMap = new Map(tags.map(t => [t.id, t.name]));
        const specialTagMap = new Map(specialTags.map(t => [t.id, t.name]));

        // 1. Summary Sheet
        const totalSpent = yearSummary.reduce((sum, m) => sum + m.spent, 0);
        const totalBudget = yearSummary.reduce((sum, m) => sum + m.budget, 0);
        const summaryData = [
            ['Year', year],
            ['Total Expenses', totalSpent],
            ['Total Budget', totalBudget],
            ['Average Monthly Expense', totalSpent / 12],
            ['Average Monthly Budget', totalBudget / 12],
            [''],
            ['Month', 'Spent', 'Budget', 'Remaining'],
            ...yearSummary.map(m => [
                new Date(year, m.month - 1).toLocaleString('default', { month: 'long' }),
                m.spent,
                m.budget,
                m.budget - m.spent
            ])
        ];
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

        // 2. Expenses Sheet
        const expensesData = [
            ['Date', 'Amount', 'Statement', 'Tag', 'Special Tags', 'Notes']
        ];
        for (const expense of allExpenses) {
            const tagName = tagMap.get(expense.tag_id) || 'Unknown';
            const specialTagIds = expenseSpecialTagsMap[expense.id] || [];
            const specialTagNames = specialTagIds.map(id => specialTagMap.get(id) || 'Unknown').join(', ');
            expensesData.push([
                expense.date,
                expense.amount,
                expense.statement,
                tagName,
                specialTagNames,
                expense.notes || ''
            ]);
        }
        const expensesSheet = XLSX.utils.aoa_to_sheet(expensesData);
        XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Expenses');

        // 3. Budgets Sheet
        const budgetsData = [
            ['Month', 'Amount']
        ];
        for (const budget of budgets) {
            budgetsData.push([
                new Date(year, budget.month - 1).toLocaleString('default', { month: 'long' }),
                budget.amount
            ]);
        }
        const budgetsSheet = XLSX.utils.aoa_to_sheet(budgetsData);
        XLSX.utils.book_append_sheet(workbook, budgetsSheet, 'Budgets');

        // 4. Accounts Sheet
        const accountsData = [
            ['ID', 'Name', 'Balance', 'Notes']
        ];
        for (const account of accounts) {
            accountsData.push([
                account.id,
                account.name,
                account.balance,
                account.notes || ''
            ]);
        }
        const accountsSheet = XLSX.utils.aoa_to_sheet(accountsData);
        XLSX.utils.book_append_sheet(workbook, accountsSheet, 'Accounts');

        // 5. Account History Sheet
        const accountHistoryData = [
            ['Account ID', 'Account Name', 'Date', 'Balance', 'Notes']
        ];
        for (const account of accounts) {
            const history = accountHistories[account.id] || [];
            for (const entry of history) {
                if (new Date(entry.date).getFullYear() === year) {
                    accountHistoryData.push([
                        account.id,
                        account.name,
                        entry.date,
                        entry.balance,
                        entry.notes || ''
                    ]);
                }
            }
        }
        const accountHistorySheet = XLSX.utils.aoa_to_sheet(accountHistoryData);
        XLSX.utils.book_append_sheet(workbook, accountHistorySheet, 'Account History');

        // 6. Assets Sheet
        const assetsData = [
            ['ID', 'Name', 'Type', 'Value', 'Notes']
        ];
        for (const asset of assets) {
            assetsData.push([
                asset.id,
                asset.name,
                asset.type,
                asset.value,
                asset.notes || ''
            ]);
        }
        const assetsSheet = XLSX.utils.aoa_to_sheet(assetsData);
        XLSX.utils.book_append_sheet(workbook, assetsSheet, 'Assets');

        // 7. Asset History Sheet
        const assetHistoryData = [
            ['Asset ID', 'Asset Name', 'Date', 'Value', 'Notes']
        ];
        for (const asset of assets) {
            const history = assetHistories[asset.id] || [];
            for (const entry of history) {
                if (new Date(entry.date).getFullYear() === year) {
                    assetHistoryData.push([
                        asset.id,
                        asset.name,
                        entry.date,
                        entry.value,
                        entry.notes || ''
                    ]);
                }
            }
        }
        const assetHistorySheet = XLSX.utils.aoa_to_sheet(assetHistoryData);
        XLSX.utils.book_append_sheet(workbook, assetHistorySheet, 'Asset History');

        // 8. Plans Sheet
        const plansData = [
            ['ID', 'Name', 'Cover Amount', 'Premium Amount', 'Premium Frequency', 'Expiry Date', 'Next Premium Date', 'Notes']
        ];
        for (const plan of plans) {
            plansData.push([
                plan.id,
                plan.name,
                plan.cover_amount,
                plan.premium_amount,
                plan.premium_frequency,
                plan.expiry_date || '',
                plan.next_premium_date || '',
                plan.notes || ''
            ]);
        }
        const plansSheet = XLSX.utils.aoa_to_sheet(plansData);
        XLSX.utils.book_append_sheet(workbook, plansSheet, 'Plans');

        // 9. Plan History Sheet
        const planHistoryData = [
            ['Plan ID', 'Plan Name', 'Date', 'Cover Amount', 'Premium Amount', 'Notes']
        ];
        for (const plan of plans) {
            const history = planHistories[plan.id] || [];
            for (const entry of history) {
                if (new Date(entry.date).getFullYear() === year) {
                    planHistoryData.push([
                        plan.id,
                        plan.name,
                        entry.date,
                        entry.cover_amount,
                        entry.premium_amount,
                        entry.notes || ''
                    ]);
                }
            }
        }
        const planHistorySheet = XLSX.utils.aoa_to_sheet(planHistoryData);
        XLSX.utils.book_append_sheet(workbook, planHistorySheet, 'Plan History');

        // 10. Life XP Sheet
        const lifeXpData = [
            ['ID', 'Name', 'Target Amount', 'Saved Amount', 'Is Repetitive', 'Frequency', 'Next Contribution Date', 'Status', 'Notes']
        ];
        for (const bucket of lifeXpBuckets) {
            lifeXpData.push([
                bucket.id,
                bucket.name,
                bucket.target_amount,
                bucket.saved_amount,
                bucket.is_repetitive ? 'Yes' : 'No',
                bucket.contribution_frequency || '',
                bucket.next_contribution_date || '',
                bucket.status,
                bucket.notes || ''
            ]);
        }
        const lifeXpSheet = XLSX.utils.aoa_to_sheet(lifeXpData);
        XLSX.utils.book_append_sheet(workbook, lifeXpSheet, 'Life XP');

        // 11. Life XP History Sheet
        const lifeXpHistoryData = [
            ['Bucket ID', 'Bucket Name', 'Date', 'Amount', 'Total Saved', 'Notes']
        ];
        for (const bucket of lifeXpBuckets) {
            const history = lifeXpHistories[bucket.id] || [];
            for (const entry of history) {
                if (new Date(entry.date).getFullYear() === year) {
                    lifeXpHistoryData.push([
                        bucket.id,
                        bucket.name,
                        entry.date,
                        entry.amount,
                        entry.total_saved,
                        entry.notes || ''
                    ]);
                }
            }
        }
        const lifeXpHistorySheet = XLSX.utils.aoa_to_sheet(lifeXpHistoryData);
        XLSX.utils.book_append_sheet(workbook, lifeXpHistorySheet, 'Life XP History');

        // 12. Fixed Returns Sheet
        const fixedReturnsData = [
            ['ID', 'Name', 'Invested Amount', 'Interest Rate (%)', 'Start Date', 'Maturity Date', 'Expected Withdrawal', 'Actual Withdrawal', 'Status', 'Closed Date', 'Notes']
        ];
        for (const fr of fixedReturns) {
            fixedReturnsData.push([
                fr.id,
                fr.name,
                fr.invested_amount,
                fr.interest_rate,
                fr.start_date,
                fr.maturity_date,
                fr.expected_withdrawal,
                fr.actual_withdrawal || '',
                fr.status,
                fr.closed_date || '',
                fr.notes || ''
            ]);
        }
        const fixedReturnsSheet = XLSX.utils.aoa_to_sheet(fixedReturnsData);
        XLSX.utils.book_append_sheet(workbook, fixedReturnsSheet, 'Fixed Returns');

        // 13. SIPs Sheet
        const sipsData = [
            ['ID', 'Name', 'Scheme Code', 'SIP Amount', 'Start Date', 'Total Units', 'Current NAV', 'Total Invested', 'Status', 'Paused Date', 'Redeemed Date', 'Redeemed Amount', 'Notes']
        ];
        for (const sip of sips) {
            sipsData.push([
                sip.id,
                sip.name,
                sip.scheme_code || '',
                sip.sip_amount,
                sip.start_date,
                sip.total_units,
                sip.current_nav,
                sip.total_invested,
                sip.status,
                sip.paused_date || '',
                sip.redeemed_date || '',
                sip.redeemed_amount || '',
                sip.notes || ''
            ]);
        }
        const sipsSheet = XLSX.utils.aoa_to_sheet(sipsData);
        XLSX.utils.book_append_sheet(workbook, sipsSheet, 'SIPs');

        // 14. SIP Transactions Sheet
        const sipTransactionsData = [
            ['SIP ID', 'SIP Name', 'Date', 'Type', 'Amount', 'NAV', 'Units', 'Notes']
        ];
        for (const sip of sips) {
            const transactions = sipTransactions[sip.id] || [];
            for (const tx of transactions) {
                if (new Date(tx.date).getFullYear() === year) {
                    sipTransactionsData.push([
                        sip.id,
                        sip.name,
                        tx.date,
                        tx.type,
                        tx.amount || '',
                        tx.nav || '',
                        tx.units || '',
                        tx.notes || ''
                    ]);
                }
            }
        }
        const sipTransactionsSheet = XLSX.utils.aoa_to_sheet(sipTransactionsData);
        XLSX.utils.book_append_sheet(workbook, sipTransactionsSheet, 'SIP Transactions');

        // 15. Recurring Deposits Sheet
        const rdsData = [
            ['ID', 'Name', 'Installment Amount', 'Frequency', 'Interest Rate (%)', 'Start Date', 'Total Installments', 'Installments Paid', 'Next Due Date', 'Maturity Value', 'Status', 'Closed Date', 'Actual Withdrawal', 'Notes']
        ];
        for (const rd of recurringDeposits) {
            rdsData.push([
                rd.id,
                rd.name,
                rd.installment_amount,
                rd.frequency,
                rd.interest_rate,
                rd.start_date,
                rd.total_installments,
                rd.installments_paid,
                rd.next_due_date || '',
                rd.maturity_value,
                rd.status,
                rd.closed_date || '',
                rd.actual_withdrawal || '',
                rd.notes || ''
            ]);
        }
        const rdsSheet = XLSX.utils.aoa_to_sheet(rdsData);
        XLSX.utils.book_append_sheet(workbook, rdsSheet, 'Recurring Deposits');

        // 16. Stocks Sheet (Indian)
        const indianStocksData = [
            ['ID', 'Symbol', 'Name', 'Quantity', 'Buy Price', 'Buy Date', 'Current Price', 'Status', 'Sell Price', 'Sell Date', 'Notes']
        ];
        for (const stock of indianStocks) {
            indianStocksData.push([
                stock.id,
                stock.symbol,
                stock.name,
                stock.quantity,
                stock.buy_price,
                stock.buy_date,
                stock.current_price,
                stock.status,
                stock.sell_price || '',
                stock.sell_date || '',
                stock.notes || ''
            ]);
        }
        const indianStocksSheet = XLSX.utils.aoa_to_sheet(indianStocksData);
        XLSX.utils.book_append_sheet(workbook, indianStocksSheet, 'Stocks - Indian');

        // 17. Stocks Sheet (US)
        const usStocksData = [
            ['ID', 'Symbol', 'Name', 'Quantity', 'Buy Price', 'Buy Date', 'Current Price', 'Status', 'Sell Price', 'Sell Date', 'Notes']
        ];
        for (const stock of usStocks) {
            usStocksData.push([
                stock.id,
                stock.symbol,
                stock.name,
                stock.quantity,
                stock.buy_price,
                stock.buy_date,
                stock.current_price,
                stock.status,
                stock.sell_price || '',
                stock.sell_date || '',
                stock.notes || ''
            ]);
        }
        const usStocksSheet = XLSX.utils.aoa_to_sheet(usStocksData);
        XLSX.utils.book_append_sheet(workbook, usStocksSheet, 'Stocks - US');

        // 18. Stocks Sheet (Crypto)
        const cryptoStocksData = [
            ['ID', 'Symbol', 'Name', 'Quantity', 'Buy Price', 'Buy Date', 'Current Price', 'Status', 'Sell Price', 'Sell Date', 'Notes']
        ];
        for (const stock of cryptoStocks) {
            cryptoStocksData.push([
                stock.id,
                stock.symbol,
                stock.name,
                stock.quantity,
                stock.buy_price,
                stock.buy_date,
                stock.current_price,
                stock.status,
                stock.sell_price || '',
                stock.sell_date || '',
                stock.notes || ''
            ]);
        }
        const cryptoStocksSheet = XLSX.utils.aoa_to_sheet(cryptoStocksData);
        XLSX.utils.book_append_sheet(workbook, cryptoStocksSheet, 'Stocks - Crypto');

        // 19. Tags Sheet
        const tagsData = [
            ['ID', 'Name', 'Page Type']
        ];
        for (const tag of tags) {
            tagsData.push([
                tag.id,
                tag.name,
                tag.page_type
            ]);
        }
        const tagsSheet = XLSX.utils.aoa_to_sheet(tagsData);
        XLSX.utils.book_append_sheet(workbook, tagsSheet, 'Tags');

        // 20. Special Tags Sheet
        const specialTagsData = [
            ['ID', 'Name']
        ];
        for (const tag of specialTags) {
            specialTagsData.push([
                tag.id,
                tag.name
            ]);
        }
        const specialTagsSheet = XLSX.utils.aoa_to_sheet(specialTagsData);
        XLSX.utils.book_append_sheet(workbook, specialTagsSheet, 'Special Tags');

        // Write file
        const fileName = `money-flow-export-${year}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    } catch (error) {
        console.error('Export failed:', error);
        throw error;
    }
}
