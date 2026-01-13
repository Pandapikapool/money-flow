import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import ExpenseForm from "../components/ExpenseForm";
import { getBudget, getYearSummary } from "../lib/api";
import { formatCurrency } from "../lib/format";

export default function Daily() {
    const [spent, setSpent] = useState(0);
    const [budgetAmount, setBudgetAmount] = useState(0);
    const [loading, setLoading] = useState(true);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthName = now.toLocaleString('default', { month: 'long' });

    const loadData = useCallback(async () => {
        try {
            // Fetch budget for current month
            const budget = await getBudget(year, month);
            setBudgetAmount(budget.amount);

            // Fetch spent for current month using year summary
            const yearData = await getYearSummary(year);
            const currentMonthData = yearData.find(m => m.month === month);
            setSpent(currentMonthData?.spent || 0);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [year, month]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleExpenseAdded = () => {
        loadData();
    };

    const remaining = budgetAmount - spent;
    const percentUsed = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '24px', textAlign: 'center' }}>Daily Tracker</h1>

            {/* Budget Summary Card */}
            <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{monthName} Spent</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '700' }}>{formatCurrency(spent)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Budget</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--accent-primary)' }}>
                            {budgetAmount > 0 ? formatCurrency(budgetAmount) : '-'}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Remaining</div>
                        <div style={{
                            fontSize: '1.4rem',
                            fontWeight: '700',
                            color: budgetAmount === 0 ? 'var(--text-secondary)' :
                                remaining < 0 ? 'var(--accent-danger)' :
                                    percentUsed >= 90 ? '#ff9800' : 'var(--accent-success)'
                        }}>
                            {budgetAmount > 0 ? formatCurrency(remaining) : '-'}
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
                {budgetAmount > 0 && (
                    <div style={{ height: '8px', background: 'var(--bg-panel)', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
                        <div style={{
                            height: '100%',
                            width: `${Math.min(percentUsed, 100)}%`,
                            background: percentUsed > 100 ? 'var(--accent-danger)' : percentUsed > 90 ? '#ff9800' : 'var(--accent-success)',
                            transition: 'width 0.3s'
                        }} />
                    </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link
                        to={`/expenses/${year}/${month}`}
                        style={{
                            padding: '8px 16px',
                            background: 'var(--bg-panel)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            textDecoration: 'none',
                            fontSize: '0.85rem'
                        }}
                    >
                        View {monthName} Expenses
                    </Link>
                    <Link
                        to="/budget"
                        style={{
                            padding: '8px 16px',
                            background: 'var(--bg-panel)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            textDecoration: 'none',
                            fontSize: '0.85rem'
                        }}
                    >
                        {budgetAmount > 0 ? 'Edit Budget' : 'Set Budget'}
                    </Link>
                    <Link
                        to="/expenses"
                        style={{
                            padding: '8px 16px',
                            background: 'var(--bg-panel)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            textDecoration: 'none',
                            fontSize: '0.85rem'
                        }}
                    >
                        All Expenses
                    </Link>
                </div>
            </div>

            {/* Expense Form */}
            <ExpenseForm onSuccess={handleExpenseAdded} />
        </div>
    );
}
