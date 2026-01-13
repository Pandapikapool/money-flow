import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getYearSummary, deleteExpensesByMonths, type MonthlyAggregate } from "../../lib/api";
import { formatCurrency } from "../../lib/format";

export default function ExpensesYear() {
    const { year } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<MonthlyAggregate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
    const [deleting, setDeleting] = useState(false);

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

    const handleDeleteClick = () => {
        setSelectedMonths([]);
        setShowDeleteModal(true);
    };

    const toggleMonth = (month: number) => {
        setSelectedMonths(prev => 
            prev.includes(month) 
                ? prev.filter(m => m !== month)
                : [...prev, month]
        );
    };

    const handleDelete = async () => {
        if (selectedMonths.length === 0) {
            alert("Please select at least one month to delete");
            return;
        }

        if (!confirm(`Are you sure you want to delete expenses for ${selectedMonths.length} month(s)? This cannot be undone.`)) {
            return;
        }

        if (!year) return;

        setDeleting(true);
        try {
            await deleteExpensesByMonths(parseInt(year), selectedMonths);
            setShowDeleteModal(false);
            setSelectedMonths([]);
            // Reload data
            getYearSummary(parseInt(year))
                .then(setData)
                .catch(console.error);
        } catch (err) {
            alert("Failed to delete expenses");
            console.error(err);
        } finally {
            setDeleting(false);
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

    return (
        <div style={{ maxWidth: '1000px' }}>
            {/* Header with year navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <button
                    onClick={() => navigate(`/expenses/${Number(year) - 1}`)}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: '600', margin: 0 }}>{year} Expenses</h1>
                    <button
                        onClick={handleDeleteClick}
                        style={{
                            background: 'var(--accent-danger)',
                            border: 'none',
                            color: '#fff',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: '500'
                        }}
                    >
                        Delete
                    </button>
                </div>
                <button
                    onClick={() => navigate(`/expenses/${Number(year) + 1}`)}
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
                    const hasData = item.spent > 0 || item.budget > 0;

                    // Calculate background color based on budget status
                    const getBgColor = () => {
                        if (!hasData || item.budget === 0) return 'var(--bg-card)';
                        if (percentUsed <= 50) return 'rgba(76, 175, 80, 0.08)'; // Very light green
                        if (percentUsed <= 70) return 'rgba(76, 175, 80, 0.15)'; // Light green
                        if (percentUsed <= 90) return 'rgba(255, 152, 0, 0.15)'; // Light orange
                        if (percentUsed <= 100) return 'rgba(255, 152, 0, 0.25)'; // Orange
                        return 'rgba(244, 67, 54, 0.2)'; // Light red for over budget
                    };

                    return (
                        <Link
                            key={item.month}
                            to={`/expenses/${year}/${item.month}`}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                            <div
                                className="glass-panel"
                                style={{
                                    padding: '16px',
                                    cursor: 'pointer',
                                    transition: 'transform 0.15s, box-shadow 0.15s, background 0.3s',
                                    border: isCurrentMonth ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                    opacity: hasData ? 1 : 0.5,
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
                                        {formatCurrency(item.spent)}
                                    </div>
                                    {item.budget > 0 && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            of {formatCurrency(item.budget)}
                                        </div>
                                    )}
                                </div>

                                {/* Progress bar */}
                                {item.budget > 0 && (
                                    <div style={{ height: '6px', background: 'var(--bg-panel)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${Math.min(percentUsed, 100)}%`,
                                            background: percentUsed > 100 ? 'var(--accent-danger)' : percentUsed > 90 ? '#ff9800' : 'var(--accent-success)'
                                        }} />
                                    </div>
                                )}

                                {/* Status */}
                                {item.budget > 0 && item.spent > 0 && (
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: diff >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
                                        fontWeight: '500'
                                    }}>
                                        {diff >= 0 ? `${formatCurrency(diff)} under` : `${formatCurrency(Math.abs(diff))} over`}
                                    </div>
                                )}

                                {item.budget === 0 && item.spent > 0 && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        No budget set
                                    </div>
                                )}

                                {!hasData && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        No data
                                    </div>
                                )}
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Back link */}
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <Link to="/expenses" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    &larr; Back to all years
                </Link>
            </div>

            {/* Delete Modal */}
            {showDeleteModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="glass-panel" style={{
                        padding: '24px',
                        maxWidth: '500px',
                        width: '90%',
                        maxHeight: '80vh',
                        overflow: 'auto'
                    }}>
                        <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Delete Expenses</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                            Select the months you want to delete expenses for:
                        </p>
                        
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '12px',
                            marginBottom: '24px'
                        }}>
                            {data.map(item => {
                                const monthName = new Date(0, item.month - 1).toLocaleString('default', { month: 'short' });
                                const hasData = item.spent > 0;
                                const isSelected = selectedMonths.includes(item.month);
                                
                                return (
                                    <label
                                        key={item.month}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px',
                                            background: isSelected ? 'var(--accent-primary)' : 'var(--bg-card)',
                                            border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            opacity: hasData ? 1 : 0.5
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleMonth(item.month)}
                                            disabled={!hasData}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        <div>
                                            <div style={{ fontWeight: '500' }}>{monthName}</div>
                                            {hasData && (
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                    {formatCurrency(item.spent)}
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                );
                            })}
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setSelectedMonths([]);
                                }}
                                disabled={deleting}
                                style={{
                                    background: 'var(--bg-panel)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)',
                                    padding: '10px 20px',
                                    borderRadius: '6px',
                                    cursor: deleting ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting || selectedMonths.length === 0}
                                style={{
                                    background: deleting || selectedMonths.length === 0 ? 'var(--text-secondary)' : 'var(--accent-danger)',
                                    border: 'none',
                                    color: '#fff',
                                    padding: '10px 20px',
                                    borderRadius: '6px',
                                    cursor: deleting || selectedMonths.length === 0 ? 'not-allowed' : 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                {deleting ? 'Deleting...' : `Delete ${selectedMonths.length} Month(s)`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
