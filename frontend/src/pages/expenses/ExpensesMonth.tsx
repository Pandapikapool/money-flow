import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchExpenses, fetchTags, getBudget, updateExpense, deleteExpense, type Expense, type Tag } from "../../lib/api";
import { formatCurrency } from "../../lib/format";

export default function ExpensesMonth() {
    const { year, month } = useParams();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [budget, setBudget] = useState(0);
    const [loading, setLoading] = useState(true);

    // Edit state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editAmount, setEditAmount] = useState("");
    const [editStatement, setEditStatement] = useState("");
    const [editNotes, setEditNotes] = useState("");

    // Delete confirmation
    const [deletingId, setDeletingId] = useState<number | null>(null);

    useEffect(() => {
        if (year && month) {
            loadData();
        }
    }, [year, month]);

    const loadData = async () => {
        if (!year || !month) return;
        setLoading(true);
        try {
            const [expensesData, tagsData, budgetData] = await Promise.all([
                fetchExpenses(parseInt(year), parseInt(month)),
                fetchTags(),
                getBudget(parseInt(year), parseInt(month))
            ]);
            setExpenses(expensesData);
            setTags(tagsData);
            setBudget(budgetData.amount);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getTagName = (tagId: number) => {
        const tag = tags.find(t => t.id === tagId);
        return tag?.name || 'Unknown';
    };

    const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const remaining = budget - total;
    const percentUsed = budget > 0 ? (total / budget) * 100 : 0;

    // Budget status
    const getBudgetStatus = () => {
        if (budget === 0) return { color: 'var(--text-secondary)', text: 'No budget set' };
        if (remaining < 0) return { color: 'var(--accent-danger)', text: `Over by ${formatCurrency(Math.abs(remaining))}` };
        if (percentUsed >= 90) return { color: '#ff9800', text: `${formatCurrency(remaining)} left (${(100 - percentUsed).toFixed(0)}%)` };
        return { color: 'var(--accent-success)', text: `${formatCurrency(remaining)} left (${(100 - percentUsed).toFixed(0)}%)` };
    };

    const budgetStatus = getBudgetStatus();

    // Edit handlers
    const startEdit = (expense: Expense) => {
        setEditingId(expense.id);
        setEditAmount(expense.amount.toString());
        setEditStatement(expense.statement);
        setEditNotes(expense.notes || "");
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditAmount("");
        setEditStatement("");
        setEditNotes("");
    };

    const saveEdit = async () => {
        if (!editingId) return;
        try {
            await updateExpense(editingId, {
                amount: parseFloat(editAmount),
                statement: editStatement,
                notes: editNotes || undefined
            });
            cancelEdit();
            loadData();
        } catch (err) {
            alert("Failed to update expense");
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteExpense(id);
            setDeletingId(null);
            loadData();
        } catch (err) {
            alert("Failed to delete expense");
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

    const monthName = new Date(0, Number(month) - 1).toLocaleString('default', { month: 'long' });

    return (
        <div style={{ maxWidth: '900px' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <Link to={`/expenses/${year}`} style={{ textDecoration: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    &larr; Back to {year}
                </Link>
                <h1 style={{ fontSize: '1.75rem', fontWeight: '600', margin: '8px 0 0' }}>{monthName} {year}</h1>
            </div>

            {/* Budget Summary Bar */}
            <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Spent</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{formatCurrency(total)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Budget</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{budget > 0 ? formatCurrency(budget) : '-'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Status</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '600', color: budgetStatus.color }}>{budgetStatus.text}</div>
                    </div>
                </div>

                {/* Progress bar */}
                {budget > 0 && (
                    <div style={{ height: '8px', background: 'var(--bg-panel)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${Math.min(percentUsed, 100)}%`,
                            background: percentUsed > 100 ? 'var(--accent-danger)' : percentUsed > 90 ? '#ff9800' : 'var(--accent-success)',
                            transition: 'width 0.3s'
                        }} />
                    </div>
                )}
            </div>

            {/* Expenses List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {expenses.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No expenses this month.
                        <br /><br />
                        <Link to="/" style={{ color: 'var(--accent-primary)' }}>Add your first expense</Link>
                    </div>
                ) : (
                    expenses.map(e => (
                        <div key={e.id} className="glass-panel" style={{ padding: '16px' }}>
                            {editingId === e.id ? (
                                // Edit mode
                                <div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '12px', marginBottom: '12px' }}>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Amount</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={editAmount}
                                                onChange={e => setEditAmount(e.target.value)}
                                                style={{ marginTop: '4px' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Statement</label>
                                            <input
                                                type="text"
                                                value={editStatement}
                                                onChange={e => setEditStatement(e.target.value)}
                                                style={{ marginTop: '4px' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Notes</label>
                                            <input
                                                type="text"
                                                value={editNotes}
                                                onChange={e => setEditNotes(e.target.value)}
                                                style={{ marginTop: '4px' }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        <button onClick={cancelEdit} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
                                        <button onClick={saveEdit} style={{ padding: '6px 12px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
                                    </div>
                                </div>
                            ) : (
                                // View mode
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontWeight: '600', fontSize: '1.05rem' }}>{e.statement}</span>
                                            <span style={{
                                                padding: '2px 8px',
                                                background: 'var(--accent-primary)',
                                                color: '#fff',
                                                borderRadius: '10px',
                                                fontSize: '0.7rem',
                                                fontWeight: '500'
                                            }}>
                                                {getTagName(e.tag_id)}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                            {new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            {e.notes && <span> &bull; {e.notes}</span>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>
                                            {formatCurrency(e.amount)}
                                        </div>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button
                                                onClick={() => startEdit(e)}
                                                style={{ padding: '4px 8px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-primary)' }}
                                            >
                                                Edit
                                            </button>
                                            {deletingId === e.id ? (
                                                <>
                                                    <button onClick={() => handleDelete(e.id)} style={{ padding: '4px 8px', background: 'var(--accent-danger)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Yes</button>
                                                    <button onClick={() => setDeletingId(null)} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-primary)' }}>No</button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => setDeletingId(e.id)}
                                                    style={{ padding: '4px 8px', background: 'transparent', border: '1px solid var(--accent-danger)', color: 'var(--accent-danger)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                                                >
                                                    Del
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Category breakdown */}
            {expenses.length > 0 && (
                <div className="glass-panel" style={{ padding: '20px', marginTop: '24px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '16px' }}>By Category</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {Object.entries(
                            expenses.reduce((acc, e) => {
                                const tagName = getTagName(e.tag_id);
                                acc[tagName] = (acc[tagName] || 0) + Number(e.amount);
                                return acc;
                            }, {} as Record<string, number>)
                        )
                            .sort((a, b) => b[1] - a[1])
                            .map(([tag, amount]) => (
                                <div key={tag} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>{tag}</span>
                                    <span style={{ fontWeight: '600' }}>{formatCurrency(amount)}</span>
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
}
