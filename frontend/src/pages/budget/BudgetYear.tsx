import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getYearSummary, type MonthlyAggregate } from "../../lib/api";
import { formatCurrency } from "../../lib/format";

export default function BudgetYear() {
    const { year } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<MonthlyAggregate[]>([]);
    const [loading, setLoading] = useState(true);

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    useEffect(() => {
        if (year) {
            getYearSummary(parseInt(year))
                .then(setData)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [year]);

    // Calculate yearly totals
    const yearlySpent = data.reduce((sum, m) => sum + m.spent, 0);
    const yearlyBudget = data.reduce((sum, m) => sum + m.budget, 0);
    const yearlyDiff = yearlyBudget - yearlySpent;

    // Count months over/under budget
    const monthsOverBudget = data.filter(m => m.budget > 0 && m.spent > m.budget).length;
    const monthsUnderBudget = data.filter(m => m.budget > 0 && m.spent <= m.budget && m.spent > 0).length;

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

    return (
        <div style={{ maxWidth: '1000px' }}>
            {/* Header with year navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <button
                    onClick={() => navigate(`/budget/${Number(year) - 1}`)}
                    style={{
                        background: 'var(--bg-panel)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer'
                    }}
                >
                    &larr; {Number(year) - 1}
                </button>
                <h1 style={{ fontSize: '1.75rem', fontWeight: '600' }}>{year} Budgets</h1>
                <button
                    onClick={() => navigate(`/budget/${Number(year) + 1}`)}
                    style={{
                        background: 'var(--bg-panel)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer'
                    }}
                >
                    {Number(year) + 1} &rarr;
                </button>
            </div>

            {/* Yearly Summary */}
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', textAlign: 'center' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                            Total Spent
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                            {formatCurrency(yearlySpent)}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                            Total Budget
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-primary)' }}>
                            {yearlyBudget > 0 ? formatCurrency(yearlyBudget) : '-'}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                            {yearlyDiff >= 0 ? 'Under Budget' : 'Over Budget'}
                        </div>
                        <div style={{
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            color: yearlyBudget === 0 ? 'var(--text-secondary)' : yearlyDiff >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'
                        }}>
                            {yearlyBudget > 0 ? formatCurrency(Math.abs(yearlyDiff)) : '-'}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                            Budget Status
                        </div>
                        <div style={{ fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--accent-success)' }}>{monthsUnderBudget}</span> under,{' '}
                            <span style={{ color: 'var(--accent-danger)' }}>{monthsOverBudget}</span> over
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '16px'
            }}>
                {data.map(item => {
                    const diff = item.budget - item.spent;
                    const percentUsed = item.budget > 0 ? (item.spent / item.budget) * 100 : 0;
                    const isCurrentMonth = Number(year) === currentYear && item.month === currentMonth;
                    const hasBudget = item.budget > 0;

                    // Calculate background color based on budget status
                    const getBgColor = () => {
                        if (!hasBudget) return 'var(--bg-card)';
                        if (percentUsed <= 50) return 'rgba(76, 175, 80, 0.08)';
                        if (percentUsed <= 70) return 'rgba(76, 175, 80, 0.15)';
                        if (percentUsed <= 90) return 'rgba(255, 152, 0, 0.15)';
                        if (percentUsed <= 100) return 'rgba(255, 152, 0, 0.25)';
                        return 'rgba(244, 67, 54, 0.2)';
                    };

                    return (
                        <Link
                            key={item.month}
                            to={`/budget/${year}/${item.month}`}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                            <div
                                className="glass-panel"
                                style={{
                                    padding: '16px',
                                    cursor: 'pointer',
                                    transition: 'transform 0.15s, box-shadow 0.15s, background 0.3s',
                                    border: isCurrentMonth ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                    background: getBgColor()
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>
                                        {new Date(0, item.month - 1).toLocaleString('default', { month: 'short' })}
                                    </h3>
                                    {isCurrentMonth && (
                                        <span style={{
                                            fontSize: '0.65rem',
                                            padding: '2px 6px',
                                            background: 'var(--accent-primary)',
                                            color: '#fff',
                                            borderRadius: '4px'
                                        }}>
                                            NOW
                                        </span>
                                    )}
                                </div>

                                <div style={{ marginBottom: '8px' }}>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '700' }}>
                                        {hasBudget ? formatCurrency(item.budget) : 'No budget'}
                                    </div>
                                    {item.spent > 0 && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            Spent: {formatCurrency(item.spent)}
                                        </div>
                                    )}
                                </div>

                                {/* Progress bar */}
                                {hasBudget && item.spent > 0 && (
                                    <div style={{ height: '6px', background: 'var(--bg-panel)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${Math.min(percentUsed, 100)}%`,
                                            background: percentUsed > 100 ? 'var(--accent-danger)' : percentUsed > 90 ? '#ff9800' : 'var(--accent-success)'
                                        }} />
                                    </div>
                                )}

                                {/* Status */}
                                {hasBudget && item.spent > 0 && (
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: diff >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
                                        fontWeight: '500'
                                    }}>
                                        {diff >= 0 ? `${formatCurrency(diff)} left` : `${formatCurrency(Math.abs(diff))} over`}
                                    </div>
                                )}

                                {!hasBudget && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        Click to set budget
                                    </div>
                                )}
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
