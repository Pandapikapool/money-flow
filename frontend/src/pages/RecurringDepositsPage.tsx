import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    fetchRecurringDeposits,
    createRecurringDeposit,
    updateRecurringDeposit,
    markRDInstallmentPaid,
    closeRecurringDeposit,
    deleteRecurringDeposit,
    type RecurringDeposit
} from "../lib/api";
import { formatCurrency } from "../lib/format";

// Load custom page title from localStorage
function getPageTitle(): string {
    try {
        return localStorage.getItem('rd_page_title') || 'Recurring Deposits';
    } catch {
        return 'Recurring Deposits';
    }
}

function savePageTitle(title: string) {
    localStorage.setItem('rd_page_title', title);
}

// Load notes from localStorage
function getRDNotes(): Record<string, string> {
    try {
        const saved = localStorage.getItem('rd_notes');
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
}

// Save notes to localStorage
function saveRDNotes(notes: Record<string, string>) {
    localStorage.setItem('rd_notes', JSON.stringify(notes));
}

// Reflection prompts for RD
const RD_REFLECTION_PROMPTS = [
    "Am I consistent with my RD installments?",
    "Is my RD frequency aligned with my cash flow?",
    "Should I increase my installment amount next year?",
    "Are there better interest rates available elsewhere?",
    "How do my RD returns compare to other investments?",
    "What financial goals are my RDs working towards?"
];

export default function RecurringDepositsPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState<RecurringDeposit[]>([]);
    const [loading, setLoading] = useState(true);

    // Page title editing
    const [pageTitle, setPageTitle] = useState(getPageTitle);
    const [editingTitle, setEditingTitle] = useState(false);
    const [titleValue, setTitleValue] = useState("");

    // Create State
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState("");
    const [newInstallmentAmount, setNewInstallmentAmount] = useState("");
    const [newFrequency, setNewFrequency] = useState<"monthly" | "yearly" | "custom">("monthly");
    const [newCustomDays, setNewCustomDays] = useState("");
    const [newInterestRate, setNewInterestRate] = useState("");
    const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [newTotalInstallments, setNewTotalInstallments] = useState("");
    const [newNotes, setNewNotes] = useState("");

    // Edit State
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editInstallmentAmount, setEditInstallmentAmount] = useState("");
    const [editFrequency, setEditFrequency] = useState<"monthly" | "yearly" | "custom">("monthly");
    const [editCustomDays, setEditCustomDays] = useState("");
    const [editInterestRate, setEditInterestRate] = useState("");
    const [editStartDate, setEditStartDate] = useState("");
    const [editTotalInstallments, setEditTotalInstallments] = useState("");
    const [editNotes, setEditNotes] = useState("");

    // Close Modal State
    const [closingItem, setClosingItem] = useState<RecurringDeposit | null>(null);
    const [closeAmount, setCloseAmount] = useState("");
    const [closeDate, setCloseDate] = useState(new Date().toISOString().split('T')[0]);

    // Delete Confirmation
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // Notes & Reflection state
    const [rdNotes, setRdNotes] = useState<Record<string, string>>(getRDNotes);
    const [notesExpanded, setNotesExpanded] = useState(false);
    const [editingNoteYear, setEditingNoteYear] = useState<string | null>(null);
    const [noteValue, setNoteValue] = useState("");
    const currentYear = new Date().getFullYear().toString();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchRecurringDeposits();
            setItems(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Page title editing
    const startEditTitle = () => {
        setEditingTitle(true);
        setTitleValue(pageTitle);
    };

    const saveTitleEdit = () => {
        const newTitle = titleValue.trim() || 'Recurring Deposits';
        setPageTitle(newTitle);
        savePageTitle(newTitle);
        setEditingTitle(false);
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') saveTitleEdit();
        else if (e.key === 'Escape') setEditingTitle(false);
    };

    // Export to CSV
    const handleExportCSV = () => {
        if (items.length === 0) return;

        const headers = "Name,Installment,Frequency,Rate %,Start Date,Paid/Total,Remaining,Invested,Maturity,Status,Notes\n";
        const rows = items.map(item =>
            `"${item.name}",${item.installment_amount},${item.frequency},${item.interest_rate},${item.start_date},${item.installments_paid}/${item.total_installments},${item.installments_remaining},${item.total_invested},${item.maturity_value},${item.status},"${(item.notes || '').replace(/"/g, '""')}"`
        ).join("\n");

        const csvContent = "data:text/csv;charset=utf-8," + headers + rows;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `recurring_deposits_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const ongoingItems = items.filter(i => i.status === 'ongoing' || i.status === 'completed').sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (a.status !== 'completed' && b.status === 'completed') return -1;
        return a.name.localeCompare(b.name);
    });
    const closedItems = items.filter(i => i.status === 'closed').sort((a, b) =>
        new Date(b.closed_date || 0).getTime() - new Date(a.closed_date || 0).getTime()
    );

    const totalInvested = ongoingItems.reduce((sum, i) => sum + i.total_invested, 0);
    const totalMaturity = ongoingItems.reduce((sum, i) => sum + i.maturity_value, 0);

    const resetCreateForm = () => {
        setNewName("");
        setNewInstallmentAmount("");
        setNewFrequency("monthly");
        setNewCustomDays("");
        setNewInterestRate("");
        setNewStartDate(new Date().toISOString().split('T')[0]);
        setNewTotalInstallments("");
        setNewNotes("");
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newInstallmentAmount || !newInterestRate || !newStartDate || !newTotalInstallments) return;

        try {
            await createRecurringDeposit(
                newName,
                parseFloat(newInstallmentAmount),
                newFrequency,
                parseFloat(newInterestRate),
                newStartDate,
                parseInt(newTotalInstallments),
                newFrequency === 'custom' && newCustomDays ? parseInt(newCustomDays) : undefined,
                newNotes || undefined
            );
            resetCreateForm();
            setIsCreating(false);
            loadData();
        } catch (err) {
            alert("Failed to create recurring deposit");
        }
    };

    const startEdit = (item: RecurringDeposit) => {
        setEditingId(item.id);
        setEditName(item.name);
        setEditInstallmentAmount(item.installment_amount.toString());
        setEditFrequency(item.frequency);
        setEditCustomDays(item.custom_frequency_days?.toString() || "");
        setEditInterestRate(item.interest_rate.toString());
        setEditStartDate(item.start_date);
        setEditTotalInstallments(item.total_installments.toString());
        setEditNotes(item.notes || "");
    };

    const cancelEdit = () => {
        setEditingId(null);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingId) return;

        try {
            await updateRecurringDeposit(
                editingId,
                editName,
                parseFloat(editInstallmentAmount),
                editFrequency,
                parseFloat(editInterestRate),
                editStartDate,
                parseInt(editTotalInstallments),
                editFrequency === 'custom' && editCustomDays ? parseInt(editCustomDays) : undefined,
                editNotes || undefined
            );
            setEditingId(null);
            loadData();
        } catch (err) {
            alert("Failed to update recurring deposit");
        }
    };

    const handleMarkPaid = async (id: number) => {
        try {
            await markRDInstallmentPaid(id);
            loadData();
        } catch (err) {
            alert("Failed to mark installment as paid");
        }
    };

    const openCloseModal = (item: RecurringDeposit) => {
        setClosingItem(item);
        setCloseAmount(item.maturity_value.toString());
        setCloseDate(new Date().toISOString().split('T')[0]);
    };

    const handleClose = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!closingItem) return;

        try {
            await closeRecurringDeposit(
                closingItem.id,
                parseFloat(closeAmount),
                closeDate
            );
            setClosingItem(null);
            loadData();
        } catch (err) {
            alert("Failed to close recurring deposit");
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteRecurringDeposit(id);
            setDeletingId(null);
            loadData();
        } catch (err) {
            alert("Failed to delete recurring deposit");
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatFrequency = (freq: string) => {
        switch (freq) {
            case 'monthly': return 'Monthly';
            case 'yearly': return 'Yearly';
            case 'custom': return 'Custom';
            default: return freq;
        }
    };

    // Notes/Reflection functions
    const startEditNote = (year: string) => {
        setEditingNoteYear(year);
        setNoteValue(rdNotes[year] || '');
    };

    const saveNote = () => {
        if (!editingNoteYear) return;
        const newNotes = { ...rdNotes };
        if (noteValue.trim()) {
            newNotes[editingNoteYear] = noteValue.trim();
        } else {
            delete newNotes[editingNoteYear];
        }
        setRdNotes(newNotes);
        saveRDNotes(newNotes);
        setEditingNoteYear(null);
    };

    const handleNoteKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setEditingNoteYear(null);
        }
    };

    // Get years for reflection (current + past 2 years)
    const reflectionYears = [currentYear, (parseInt(currentYear) - 1).toString(), (parseInt(currentYear) - 2).toString()];

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

    return (
        <div style={{ maxWidth: '1400px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        onClick={() => navigate('/investments')}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            padding: '4px'
                        }}
                    >
                        &larr;
                    </button>
                    {editingTitle ? (
                        <input
                            type="text"
                            value={titleValue}
                            onChange={e => setTitleValue(e.target.value)}
                            onBlur={saveTitleEdit}
                            onKeyDown={handleTitleKeyDown}
                            autoFocus
                            style={{
                                fontSize: '1.75rem',
                                fontWeight: '600',
                                padding: '4px 8px',
                                border: '1px solid var(--accent-primary)',
                                borderRadius: '4px',
                                background: 'var(--bg-app)',
                                width: '300px'
                            }}
                        />
                    ) : (
                        <h1
                            style={{ fontSize: '1.75rem', fontWeight: '600', margin: 0, cursor: 'text' }}
                            onDoubleClick={startEditTitle}
                            title="Double-click to edit title"
                        >
                            {pageTitle}
                        </h1>
                    )}

                    <button
                        onClick={handleExportCSV}
                        disabled={items.length === 0}
                        style={{
                            marginLeft: '16px',
                            padding: '6px 12px',
                            background: 'transparent',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            cursor: items.length === 0 ? 'not-allowed' : 'pointer',
                            fontSize: '0.8rem',
                            color: 'var(--text-primary)',
                            opacity: items.length === 0 ? 0.5 : 1
                        }}
                    >
                        Export CSV
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Invested</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-primary)' }}>
                            {formatCurrency(totalInvested)}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Expected Maturity</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-success)' }}>
                            {formatCurrency(totalMaturity)}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Active</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                            {ongoingItems.filter(i => i.status === 'ongoing').length}
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-panel)' }}>
                            <th style={{ textAlign: 'left', padding: '16px', fontSize: '0.85rem', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>Name</th>
                            <th style={{ textAlign: 'right', padding: '16px', fontSize: '0.85rem', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>Installment</th>
                            <th style={{ textAlign: 'center', padding: '16px', fontSize: '0.85rem', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>Rate %</th>
                            <th style={{ textAlign: 'left', padding: '16px', fontSize: '0.85rem', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>Started</th>
                            <th style={{ textAlign: 'center', padding: '16px', fontSize: '0.85rem', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>Paid / Total</th>
                            <th style={{ textAlign: 'center', padding: '16px', fontSize: '0.85rem', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>Remaining</th>
                            <th style={{ textAlign: 'right', padding: '16px', fontSize: '0.85rem', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>Invested</th>
                            <th style={{ textAlign: 'right', padding: '16px', fontSize: '0.85rem', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>Maturity</th>
                            <th style={{ width: '220px', padding: '16px', borderBottom: '1px solid var(--border-color)' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Ongoing Items */}
                        {ongoingItems.map(item => (
                            editingId === item.id ? (
                                <tr key={item.id} style={{ background: 'rgba(99, 102, 241, 0.05)' }}>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%' }} />
                                    </td>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                                        <input type="number" value={editInstallmentAmount} onChange={e => setEditInstallmentAmount(e.target.value)} style={{ width: '80px', textAlign: 'right' }} />
                                    </td>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                                        <input type="number" step="0.01" value={editInterestRate} onChange={e => setEditInterestRate(e.target.value)} style={{ width: '60px', textAlign: 'center' }} />
                                    </td>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                                        <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} style={{ width: '130px' }} />
                                    </td>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>
                                        <input type="number" value={editTotalInstallments} onChange={e => setEditTotalInstallments(e.target.value)} style={{ width: '60px', textAlign: 'center' }} />
                                    </td>
                                    <td colSpan={2} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
                                        (auto-calculated)
                                    </td>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                                        <input type="text" value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notes" style={{ width: '100%' }} />
                                    </td>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={handleUpdate} style={{ padding: '6px 12px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Save</button>
                                            <button onClick={cancelEdit} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-primary)' }}>Cancel</button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                <tr key={item.id} style={item.status === 'completed' ? { background: 'rgba(16, 185, 129, 0.05)' } : {}}>
                                    <td style={{ padding: '16px', fontWeight: '500', borderBottom: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {item.name}
                                            {item.status === 'completed' && (
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    padding: '2px 6px',
                                                    background: 'rgba(16, 185, 129, 0.2)',
                                                    color: 'rgb(16, 130, 90)',
                                                    borderRadius: '4px',
                                                    fontWeight: '600'
                                                }}>
                                                    COMPLETED
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                            {formatFrequency(item.frequency)}{item.custom_frequency_days ? ` (${item.custom_frequency_days} days)` : ''}
                                            {item.next_due_date && item.status === 'ongoing' && (
                                                <> • Next: {formatDate(item.next_due_date)}</>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>
                                        {formatCurrency(item.installment_amount)}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                                        {item.interest_rate}%
                                    </td>
                                    <td style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
                                        {formatDate(item.start_date)}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center', fontFamily: 'monospace', borderBottom: '1px solid var(--border-color)' }}>
                                        {item.installments_paid} / {item.total_installments}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                                        <span style={{
                                            color: item.installments_remaining > 0 ? 'var(--text-secondary)' : 'var(--accent-success)',
                                            fontWeight: item.installments_remaining === 0 ? '600' : '400'
                                        }}>
                                            {item.installments_remaining}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-color)' }}>
                                        {formatCurrency(item.total_invested)}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: 'var(--accent-success)', borderBottom: '1px solid var(--border-color)' }}>
                                        {formatCurrency(item.maturity_value)}
                                    </td>
                                    <td style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                            {item.status === 'ongoing' && (
                                                <button
                                                    onClick={() => handleMarkPaid(item.id)}
                                                    style={{ padding: '5px 10px', background: 'var(--accent-success)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}
                                                >
                                                    Mark Paid
                                                </button>
                                            )}
                                            <button
                                                onClick={() => startEdit(item)}
                                                disabled={item.status === 'completed'}
                                                style={{
                                                    padding: '5px 10px',
                                                    background: 'transparent',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '4px',
                                                    cursor: item.status === 'completed' ? 'not-allowed' : 'pointer',
                                                    fontSize: '0.7rem',
                                                    color: 'var(--text-primary)',
                                                    opacity: item.status === 'completed' ? 0.5 : 1
                                                }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => openCloseModal(item)}
                                                style={{ padding: '5px 10px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', border: '1px solid var(--accent-danger)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}
                                            >
                                                Close
                                            </button>
                                            {deletingId === item.id ? (
                                                <>
                                                    <button onClick={() => handleDelete(item.id)} style={{ padding: '5px 10px', background: 'var(--accent-danger)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>Yes</button>
                                                    <button onClick={() => setDeletingId(null)} style={{ padding: '5px 10px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', color: 'var(--text-primary)' }}>No</button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => setDeletingId(item.id)}
                                                    style={{ padding: '5px 10px', background: 'transparent', border: '1px solid var(--accent-danger)', color: 'var(--accent-danger)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}
                                                >
                                                    Del
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        ))}

                        {/* Separator */}
                        {ongoingItems.length > 0 && closedItems.length > 0 && (
                            <tr>
                                <td colSpan={9} style={{ padding: '16px', background: 'var(--bg-panel)', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                    Closed
                                </td>
                            </tr>
                        )}

                        {/* Closed Items */}
                        {closedItems.map(item => (
                            <tr key={item.id} style={{ opacity: 0.6 }}>
                                <td style={{ padding: '16px', fontWeight: '500', borderBottom: '1px solid var(--border-color)' }}>
                                    {item.name}
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                        Closed {item.closed_date ? formatDate(item.closed_date) : '-'}
                                    </div>
                                </td>
                                <td style={{ padding: '16px', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>
                                    {formatCurrency(item.installment_amount)}
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                                    {item.interest_rate}%
                                </td>
                                <td style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
                                    {formatDate(item.start_date)}
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                                    {item.installments_paid} / {item.total_installments}
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                                    -
                                </td>
                                <td style={{ padding: '16px', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>
                                    {formatCurrency(item.total_invested)}
                                </td>
                                <td style={{ padding: '16px', textAlign: 'right', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>
                                    {formatCurrency(item.actual_withdrawal || 0)}
                                </td>
                                <td style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
                                    {deletingId === item.id ? (
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                            <button onClick={() => handleDelete(item.id)} style={{ padding: '5px 10px', background: 'var(--accent-danger)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>Yes</button>
                                            <button onClick={() => setDeletingId(null)} style={{ padding: '5px 10px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', color: 'var(--text-primary)' }}>No</button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setDeletingId(item.id)}
                                            style={{ padding: '5px 10px', background: 'transparent', border: '1px solid var(--accent-danger)', color: 'var(--accent-danger)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}
                                        >
                                            Del
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Add New Row */}
                {!isCreating ? (
                    <div
                        style={{
                            padding: '16px',
                            borderTop: '1px solid var(--border-color)',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                        onClick={() => setIsCreating(true)}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-panel)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        <span style={{ fontSize: '1.2rem' }}>+</span> Add Recurring Deposit
                    </div>
                ) : (
                    <form onSubmit={handleCreate} style={{ padding: '16px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-panel)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 80px 120px 80px 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Name</label>
                                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g., SBI RD" autoFocus />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Installment</label>
                                <input type="number" value={newInstallmentAmount} onChange={e => setNewInstallmentAmount(e.target.value)} placeholder="5000" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Frequency</label>
                                <select value={newFrequency} onChange={e => setNewFrequency(e.target.value as "monthly" | "yearly" | "custom")} style={{ width: '100%' }}>
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">Yearly</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Rate %</label>
                                <input type="number" step="0.01" value={newInterestRate} onChange={e => setNewInterestRate(e.target.value)} placeholder="6.5" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Start Date</label>
                                <input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total #</label>
                                <input type="number" value={newTotalInstallments} onChange={e => setNewTotalInstallments(e.target.value)} placeholder="60" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Notes</label>
                                <input type="text" value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Optional" />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button type="button" onClick={() => { setIsCreating(false); resetCreateForm(); }} style={{ padding: '8px 12px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
                                <button type="submit" style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Add</button>
                            </div>
                        </div>
                        {newFrequency === 'custom' && (
                            <div style={{ marginTop: '12px' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Custom Frequency (days)</label>
                                <input type="number" value={newCustomDays} onChange={e => setNewCustomDays(e.target.value)} placeholder="e.g., 15 for bi-weekly" style={{ width: '150px' }} />
                            </div>
                        )}
                    </form>
                )}
            </div>

            {/* Notes & Reflection Section */}
            <div style={{ marginTop: '40px' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '16px',
                        cursor: 'pointer'
                    }}
                    onClick={() => setNotesExpanded(!notesExpanded)}
                >
                    <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', transition: 'transform 0.2s', transform: notesExpanded ? 'rotate(90deg)' : 'rotate(0)' }}>
                        &#9654;
                    </span>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>Notes & Yearly Reflection</h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        (click to {notesExpanded ? 'collapse' : 'expand'})
                    </span>
                </div>

                {notesExpanded && (
                    <div className="glass-panel" style={{ padding: '24px' }}>
                        {/* Reflection Prompts */}
                        <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--bg-panel)', borderRadius: '8px', borderLeft: '3px solid var(--accent-primary)' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '10px', color: 'var(--accent-primary)' }}>
                                Reflection Prompts
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                                {RD_REFLECTION_PROMPTS.map((prompt, idx) => (
                                    <li key={idx}>{prompt}</li>
                                ))}
                            </ul>
                        </div>

                        {/* Yearly Notes */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                            {reflectionYears.map(year => (
                                <div key={year} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <div style={{ fontWeight: '600', fontSize: '1rem' }}>
                                            {year} {year === currentYear && <span style={{ fontSize: '0.7rem', color: 'var(--accent-success)', marginLeft: '6px' }}>Current</span>}
                                        </div>
                                        {editingNoteYear !== year && (
                                            <button
                                                onClick={() => startEditNote(year)}
                                                style={{
                                                    padding: '4px 10px',
                                                    background: 'transparent',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.75rem',
                                                    color: 'var(--text-primary)'
                                                }}
                                            >
                                                {rdNotes[year] ? 'Edit' : 'Add Notes'}
                                            </button>
                                        )}
                                    </div>

                                    {editingNoteYear === year ? (
                                        <div>
                                            <textarea
                                                value={noteValue}
                                                onChange={e => setNoteValue(e.target.value)}
                                                onKeyDown={handleNoteKeyDown}
                                                placeholder="Write your RD reflections for this year..."
                                                autoFocus
                                                rows={6}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    border: '1px solid var(--accent-primary)',
                                                    borderRadius: '6px',
                                                    background: 'var(--bg-app)',
                                                    resize: 'vertical',
                                                    fontSize: '0.85rem',
                                                    lineHeight: '1.5'
                                                }}
                                            />
                                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => setEditingNoteYear(null)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        background: 'transparent',
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8rem',
                                                        color: 'var(--text-primary)'
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={saveNote}
                                                    style={{
                                                        padding: '6px 14px',
                                                        background: 'var(--accent-primary)',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8rem'
                                                    }}
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{
                                            fontSize: '0.85rem',
                                            color: rdNotes[year] ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            lineHeight: '1.6',
                                            whiteSpace: 'pre-wrap',
                                            minHeight: '60px'
                                        }}>
                                            {rdNotes[year] || 'No notes yet. Click "Add Notes" to write your reflections.'}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Close Modal */}
            {closingItem && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
                        display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}
                    onClick={() => setClosingItem(null)}
                >
                    <div
                        style={{
                            backgroundColor: 'var(--bg-app)', padding: '28px', borderRadius: '12px',
                            minWidth: '400px', maxWidth: '500px'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 style={{ margin: '0 0 20px' }}>Close "{closingItem.name}"</h3>
                        <form onSubmit={handleClose}>
                            <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg-panel)', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Total Invested:</span>
                                    <span style={{ fontWeight: '600' }}>{formatCurrency(closingItem.total_invested)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Expected Maturity:</span>
                                    <span style={{ fontWeight: '600', color: 'var(--accent-success)' }}>{formatCurrency(closingItem.maturity_value)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Installments Paid:</span>
                                    <span style={{ fontWeight: '600' }}>{closingItem.installments_paid} / {closingItem.total_installments}</span>
                                </div>
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px' }}>Actual Withdrawal Amount</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={closeAmount}
                                    onChange={e => setCloseAmount(e.target.value)}
                                    style={{ width: '100%', fontSize: '1.25rem', fontWeight: '600' }}
                                    autoFocus
                                />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px' }}>Close Date</label>
                                <input
                                    type="date"
                                    value={closeDate}
                                    onChange={e => setCloseDate(e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setClosingItem(null)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
                                <button type="submit" style={{ padding: '10px 24px', background: 'var(--accent-danger)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Close RD</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
