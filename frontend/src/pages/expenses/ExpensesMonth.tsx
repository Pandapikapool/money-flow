import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchExpenses, fetchTags, fetchSpecialTags, getBudget, updateExpense, deleteExpense, getExpenseSpecialTags, createTag, type Expense, type Tag, type SpecialTag } from "../../lib/api";
import { formatCurrency } from "../../lib/format";

export default function ExpensesMonth() {
    const { year, month } = useParams();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [specialTags, setSpecialTags] = useState<SpecialTag[]>([]);
    const [expenseSpecialTags, setExpenseSpecialTags] = useState<Record<number, number[]>>({});
    const [budget, setBudget] = useState(0);
    const [loading, setLoading] = useState(true);

    // Edit state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editAmount, setEditAmount] = useState("");
    const [editStatement, setEditStatement] = useState("");
    const [editDate, setEditDate] = useState("");
    const [editTagId, setEditTagId] = useState<number | null>(null);
    const [editTagName, setEditTagName] = useState("");
    const [editSelectedSpecialTagIds, setEditSelectedSpecialTagIds] = useState<number[]>([]);
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
            const [expensesData, tagsData, specialTagsData, budgetData] = await Promise.all([
                fetchExpenses(parseInt(year), parseInt(month)),
                fetchTags(),
                fetchSpecialTags(),
                getBudget(parseInt(year), parseInt(month))
            ]);
            setExpenses(expensesData);
            setTags(tagsData);
            setSpecialTags(specialTagsData);
            setBudget(budgetData.amount);
            
            // Fetch special tags for all expenses
            const specialTagsMap: Record<number, number[]> = {};
            await Promise.all(
                expensesData.map(async (expense) => {
                    try {
                        const specialTagIds = await getExpenseSpecialTags(expense.id);
                        specialTagsMap[expense.id] = specialTagIds;
                    } catch (err) {
                        console.error(`Failed to fetch special tags for expense ${expense.id}:`, err);
                        specialTagsMap[expense.id] = [];
                    }
                })
            );
            setExpenseSpecialTags(specialTagsMap);
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
    const startEdit = async (expense: Expense) => {
        setEditingId(expense.id);
        setEditAmount(expense.amount.toString());
        setEditStatement(expense.statement);
        // Format date as YYYY-MM-DD for input
        const dateStr = new Date(expense.date).toISOString().split('T')[0];
        setEditDate(dateStr);
        setEditTagId(expense.tag_id);
        const tag = tags.find(t => t.id === expense.tag_id);
        setEditTagName(tag?.name || "");
        setEditNotes(expense.notes || "");
        
        // Fetch special tags for this expense
        try {
            const specialTagIds = await getExpenseSpecialTags(expense.id);
            setEditSelectedSpecialTagIds(specialTagIds);
        } catch (err) {
            console.error("Failed to fetch special tags:", err);
            setEditSelectedSpecialTagIds([]);
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditAmount("");
        setEditStatement("");
        setEditDate("");
        setEditTagId(null);
        setEditTagName("");
        setEditSelectedSpecialTagIds([]);
        setEditNotes("");
    };

    const toggleSpecialTag = (id: number) => {
        setEditSelectedSpecialTagIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const saveEdit = async () => {
        if (!editingId) return;
        if (!editTagName.trim()) {
            alert("Please select or enter a tag");
            return;
        }
        
        try {
            // Resolve tag ID (find existing or create new)
            let finalTagId: number;
            const normalizedTagName = editTagName.trim();
            const existingTag = tags.find(t => t.name.toLowerCase() === normalizedTagName.toLowerCase());
            
            if (existingTag) {
                finalTagId = existingTag.id;
            } else {
                // Create new tag
                const newTag = await createTag(normalizedTagName);
                setTags(prev => [...prev, newTag]);
                finalTagId = newTag.id;
            }
            
            await updateExpense(editingId, {
                amount: parseFloat(editAmount),
                statement: editStatement,
                date: editDate,
                tag_id: finalTagId,
                special_tag_ids: editSelectedSpecialTagIds,
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
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Amount</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={editAmount}
                                                    onChange={e => setEditAmount(e.target.value)}
                                                    style={{ marginTop: '4px', width: '100%' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Statement</label>
                                                <input
                                                    type="text"
                                                    value={editStatement}
                                                    onChange={e => setEditStatement(e.target.value)}
                                                    style={{ marginTop: '4px', width: '100%' }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Date</label>
                                            <input
                                                type="text"
                                                value={editDate}
                                                onChange={e => setEditDate(e.target.value)}
                                                pattern="\d{4}-\d{2}-\d{2}"
                                                placeholder="YYYY-MM-DD"
                                                style={{ marginTop: '4px', width: '100%' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                Category <span style={{ opacity: 0.6 }}>(type to create new)</span>
                                            </label>
                                            <input
                                                list="edit-tags-list"
                                                value={editTagName}
                                                onChange={e => setEditTagName(e.target.value)}
                                                placeholder="Food, Transport, Bills..."
                                                style={{ marginTop: '4px', width: '100%' }}
                                            />
                                            <datalist id="edit-tags-list">
                                                {tags.map(t => <option key={t.id} value={t.name} />)}
                                            </datalist>
                                        </div>
                                        {specialTags.length > 0 && (
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                                                    Special Tags <span style={{ opacity: 0.6 }}>(optional)</span>
                                                </label>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                    {specialTags.map(st => {
                                                        const isSelected = editSelectedSpecialTagIds.includes(st.id);
                                                        return (
                                                            <div
                                                                key={st.id}
                                                                onClick={() => toggleSpecialTag(st.id)}
                                                                style={{
                                                                    padding: '6px 14px',
                                                                    borderRadius: '16px',
                                                                    cursor: 'pointer',
                                                                    fontSize: '0.85rem',
                                                                    border: '1px solid var(--accent-primary)',
                                                                    background: isSelected ? 'var(--accent-primary)' : 'transparent',
                                                                    color: isSelected ? '#fff' : 'var(--accent-primary)',
                                                                    transition: 'all 0.15s'
                                                                }}
                                                            >
                                                                {st.name}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Notes</label>
                                            <input
                                                type="text"
                                                value={editNotes}
                                                onChange={e => setEditNotes(e.target.value)}
                                                placeholder="Optional"
                                                style={{ marginTop: '4px', width: '100%' }}
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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
                                            {expenseSpecialTags[e.id] && expenseSpecialTags[e.id].length > 0 && (
                                                <>
                                                    {expenseSpecialTags[e.id].map(stId => {
                                                        const st = specialTags.find(t => t.id === stId);
                                                        return st ? (
                                                            <span
                                                                key={stId}
                                                                style={{
                                                                    padding: '2px 8px',
                                                                    background: 'var(--accent-warning)',
                                                                    color: '#fff',
                                                                    borderRadius: '10px',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: '500'
                                                                }}
                                                            >
                                                                {st.name}
                                                            </span>
                                                        ) : null;
                                                    })}
                                                </>
                                            )}
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
