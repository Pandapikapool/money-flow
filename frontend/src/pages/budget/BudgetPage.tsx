import { useState, useEffect } from "react";
import { getBudget, setBudget, getYearSummary, type MonthlyBudget, type MonthlyAggregate } from "../../lib/api";
import { formatCurrency } from "../../lib/format";

export default function BudgetPage() {
    const [date, setDate] = useState(new Date());
    const [budget, setBudgetState] = useState<MonthlyBudget | null>(null);
    const [monthData, setMonthData] = useState<MonthlyAggregate | null>(null);
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, [date]);

    const loadData = async () => {
        setLoading(true);
        try {
            const year = date.getFullYear();
            const month = date.getMonth() + 1;

            const [budgetData, yearData] = await Promise.all([
                getBudget(year, month),
                getYearSummary(year)
            ]);

            setBudgetState(budgetData);
            setAmount(budgetData.amount.toString());

            // Find current month data
            const currentMonthData = yearData.find(m => m.month === month);
            setMonthData(currentMonthData || null);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const val = parseFloat(amount);
            if (isNaN(val) || val < 0) {
                alert("Please enter a valid amount");
                return;
            }

            const updated = await setBudget(date.getFullYear(), date.getMonth() + 1, val);
            setBudgetState(updated);
            loadData(); // Refresh to update status
        } catch (err) {
            alert("Failed to save budget");
        } finally {
            setSaving(false);
        }
    };

    const changeMonth = (delta: number) => {
        const newDate = new Date(date);
        newDate.setMonth(newDate.getMonth() + delta);
        setDate(newDate);
    };

    // Calculate budget status
    const spent = monthData?.spent || 0;
    const budgetAmount = budget?.amount || 0;
    const remaining = budgetAmount - spent;
    const percentUsed = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

    const getStatusColor = () => {
        if (budgetAmount === 0) return 'var(--text-secondary)';
        if (remaining < 0) return 'var(--accent-danger)';
        if (percentUsed >= 90) return '#ff9800';
        return 'var(--accent-success)';
    };

    const getStatusText = () => {
        if (budgetAmount === 0) return 'No budget set';
        if (remaining < 0) return `Over budget by ${formatCurrency(Math.abs(remaining))}`;
        if (percentUsed >= 90) return `Warning: Only ${formatCurrency(remaining)} left`;
        return `${formatCurrency(remaining)} remaining`;
    };

    if (loading && !budget) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

    const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
        <div style={{ maxWidth: '700px' }}>
            {/* Header with month navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <button
                    onClick={() => changeMonth(-1)}
                    style={{
                        background: 'var(--bg-panel)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '1rem'
                    }}
                >
                    &larr; Prev
                </button>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '600' }}>{monthYear}</h1>
                <button
                    onClick={() => changeMonth(1)}
                    style={{
                        background: 'var(--bg-panel)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '1rem'
                    }}
                >
                    Next &rarr;
                </button>
            </div>

            {/* Budget Status Card */}
            <div className="glass-panel" style={{ padding: '28px', marginBottom: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', textAlign: 'center', marginBottom: '24px' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                            Total Spent
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                            {formatCurrency(spent)}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                            Budget
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-primary)' }}>
                            {budgetAmount > 0 ? formatCurrency(budgetAmount) : '-'}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                            Remaining
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: getStatusColor() }}>
                            {budgetAmount > 0 ? formatCurrency(remaining) : '-'}
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
                {budgetAmount > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ height: '12px', background: 'var(--bg-panel)', borderRadius: '6px', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%',
                                width: `${Math.min(percentUsed, 100)}%`,
                                background: getStatusColor(),
                                transition: 'width 0.3s'
                            }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <span>{percentUsed.toFixed(0)}% used</span>
                            <span>{(100 - percentUsed).toFixed(0)}% remaining</span>
                        </div>
                    </div>
                )}

                {/* Status message */}
                <div style={{
                    textAlign: 'center',
                    padding: '12px',
                    background: 'var(--bg-panel)',
                    borderRadius: '8px',
                    color: getStatusColor(),
                    fontWeight: '600'
                }}>
                    {getStatusText()}
                </div>
            </div>

            {/* Set Budget Form */}
            <div className="glass-panel" style={{ padding: '28px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '20px', textAlign: 'center' }}>
                    Set Budget for {monthYear}
                </h3>

                <form onSubmit={handleSave}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                        <span style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>₹</span>
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="50000"
                            style={{
                                fontSize: '2rem',
                                fontWeight: 'bold',
                                textAlign: 'center',
                                width: '200px',
                                background: 'var(--bg-panel)',
                                border: '2px solid var(--border-color)',
                                borderRadius: '8px',
                                padding: '12px'
                            }}
                        />
                    </div>

                    <div style={{ textAlign: 'center' }}>
                        <button
                            type="submit"
                            disabled={saving}
                            style={{
                                padding: '12px 32px',
                                background: 'var(--accent-primary)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                fontWeight: '600'
                            }}
                        >
                            {saving ? 'Saving...' : 'Update Budget'}
                        </button>
                    </div>
                </form>

                <p style={{ marginTop: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    Budget is used to track spending limits and show warnings when you're close to or over budget.
                </p>
            </div>

            {/* Quick Info */}
            <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-panel)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <strong>Budget Status Colors:</strong>
                <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                    <li><span style={{ color: 'var(--accent-success)' }}>Green</span> — Within budget (less than 90% used)</li>
                    <li><span style={{ color: '#ff9800' }}>Orange</span> — Warning (90%+ used but not over)</li>
                    <li><span style={{ color: 'var(--accent-danger)' }}>Red</span> — Over budget</li>
                </ul>
            </div>
        </div>
    );
}
