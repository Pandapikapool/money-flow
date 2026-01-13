import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getBudget, setBudget, getYearSummary, type MonthlyBudget, type MonthlyAggregate } from "../../lib/api";
import { formatCurrency } from "../../lib/format";

export default function BudgetMonth() {
    const { year, month } = useParams();
    const navigate = useNavigate();
    const [budget, setBudgetState] = useState<MonthlyBudget | null>(null);
    const [monthData, setMonthData] = useState<MonthlyAggregate | null>(null);
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (year && month) {
            loadData();
        }
    }, [year, month]);

    const loadData = async () => {
        if (!year || !month) return;
        setLoading(true);
        try {
            const [budgetData, yearData] = await Promise.all([
                getBudget(parseInt(year), parseInt(month)),
                getYearSummary(parseInt(year))
            ]);

            setBudgetState(budgetData);
            setAmount(budgetData.amount.toString());

            const currentMonthData = yearData.find(m => m.month === parseInt(month));
            setMonthData(currentMonthData || null);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!year || !month) return;
        
        setSaving(true);
        try {
            const val = parseFloat(amount);
            if (isNaN(val) || val < 0) {
                alert("Please enter a valid amount");
                return;
            }

            await setBudget(parseInt(year), parseInt(month), val);
            loadData();
        } catch (err) {
            alert("Failed to save budget");
        } finally {
            setSaving(false);
        }
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

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

    const monthName = month ? new Date(0, parseInt(month) - 1).toLocaleString('default', { month: 'long' }) : '';
    const monthYear = `${monthName} ${year}`;

    return (
        <div style={{ maxWidth: '700px' }}>
            {/* Header with navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <button
                    onClick={() => {
                        if (month && parseInt(month) > 1) {
                            navigate(`/budget/${year}/${parseInt(month) - 1}`);
                        } else if (year) {
                            navigate(`/budget/${parseInt(year) - 1}/12`);
                        }
                    }}
                    style={{
                        background: 'var(--bg-panel)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer'
                    }}
                >
                    &larr; Prev
                </button>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '600' }}>{monthYear}</h1>
                <button
                    onClick={() => {
                        if (month && parseInt(month) < 12) {
                            navigate(`/budget/${year}/${parseInt(month) + 1}`);
                        } else if (year) {
                            navigate(`/budget/${parseInt(year) + 1}/1`);
                        }
                    }}
                    style={{
                        background: 'var(--bg-panel)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer'
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
            </div>

            {/* Back link */}
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <Link to={`/budget/${year}`} style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    &larr; Back to {year}
                </Link>
            </div>
        </div>
    );
}
