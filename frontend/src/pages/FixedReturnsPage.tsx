import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    fetchFixedReturns,
    createFixedReturn,
    updateFixedReturn,
    closeFixedReturn,
    updateClosedFixedReturn,
    deleteFixedReturn,
    type FixedReturn
} from "../lib/api";
import { formatCurrency } from "../lib/format";

// Load custom page title from localStorage
function getPageTitle(): string {
    try {
        return localStorage.getItem('fixed_returns_page_title') || 'Fixed Returns';
    } catch {
        return 'Fixed Returns';
    }
}

function savePageTitle(title: string) {
    localStorage.setItem('fixed_returns_page_title', title);
}

// Load notes from localStorage
function getFixedReturnsNotes(): Record<string, string> {
    try {
        const saved = localStorage.getItem('fixed_returns_notes');
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
}

// Save notes to localStorage
function saveFixedReturnsNotes(notes: Record<string, string>) {
    localStorage.setItem('fixed_returns_notes', JSON.stringify(notes));
}

// Reflection prompts for FD/Fixed Returns
const FD_REFLECTION_PROMPTS = [
    "Am I getting the best interest rates for my FDs?",
    "Should I ladder my FDs for better liquidity?",
    "Are my maturity dates aligned with my future needs?",
    "Did any FDs underperform expectations due to early withdrawal?",
    "Should I consider tax-saving FDs next year?",
    "What's my strategy for reinvesting maturing FDs?"
];

export default function FixedReturnsPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState<FixedReturn[]>([]);
    const [loading, setLoading] = useState(true);

    // Page title editing
    const [pageTitle, setPageTitle] = useState(getPageTitle);
    const [editingTitle, setEditingTitle] = useState(false);
    const [titleValue, setTitleValue] = useState("");

    // Create State
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState("");
    const [newInvested, setNewInvested] = useState("");
    const [newRate, setNewRate] = useState("");
    const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [newMaturityDate, setNewMaturityDate] = useState("");
    const [newNotes, setNewNotes] = useState("");

    // Edit State (for ongoing)
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editInvested, setEditInvested] = useState("");
    const [editRate, setEditRate] = useState("");
    const [editStartDate, setEditStartDate] = useState("");
    const [editMaturityDate, setEditMaturityDate] = useState("");
    const [editNotes, setEditNotes] = useState("");

    // Close Modal State
    const [closingItem, setClosingItem] = useState<FixedReturn | null>(null);
    const [closeWithdrawal, setCloseWithdrawal] = useState("");
    const [closeDate, setCloseDate] = useState(new Date().toISOString().split('T')[0]);

    // Edit Closed State
    const [editingClosedId, setEditingClosedId] = useState<number | null>(null);
    const [editClosedWithdrawal, setEditClosedWithdrawal] = useState("");
    const [editClosedDate, setEditClosedDate] = useState("");
    const [editClosedNotes, setEditClosedNotes] = useState("");

    // Delete Confirmation
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // Notes & Reflection state
    const [fdNotes, setFdNotes] = useState<Record<string, string>>(getFixedReturnsNotes);
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
            const data = await fetchFixedReturns();
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
        const newTitle = titleValue.trim() || 'Fixed Returns';
        setPageTitle(newTitle);
        savePageTitle(newTitle);
        setEditingTitle(false);
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') saveTitleEdit();
        else if (e.key === 'Escape') setEditingTitle(false);
    };

    // Check if item is maturing within 30 days
    const isMaturingSoon = (maturityDate: string): boolean => {
        const maturity = new Date(maturityDate);
        const today = new Date();
        const diffDays = Math.ceil((maturity.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 30;
    };

    // Get days until maturity
    const getDaysUntilMaturity = (maturityDate: string): number => {
        const maturity = new Date(maturityDate);
        const today = new Date();
        return Math.ceil((maturity.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    };

    // Export to CSV
    const handleExportCSV = () => {
        if (items.length === 0) return;

        const headers = "Name,Invested Amount,Interest Rate %,Start Date,Maturity Date,Expected Withdrawal,Actual Withdrawal,Status,Closed Date,Notes\n";
        const rows = items.map(item =>
            `"${item.name}",${item.invested_amount},${item.interest_rate},${item.start_date},${item.maturity_date},${item.expected_withdrawal},${item.actual_withdrawal || ''},${item.status},${item.closed_date || ''},"${(item.notes || '').replace(/"/g, '""')}"`
        ).join("\n");

        const csvContent = "data:text/csv;charset=utf-8," + headers + rows;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `fixed_returns_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const ongoingItems = items.filter(i => i.status === 'ongoing').sort((a, b) =>
        new Date(a.maturity_date).getTime() - new Date(b.maturity_date).getTime()
    );
    const closedItems = items.filter(i => i.status === 'closed').sort((a, b) =>
        new Date(b.closed_date || b.maturity_date).getTime() - new Date(a.closed_date || a.maturity_date).getTime()
    );

    // Count items maturing soon
    const maturingSoonCount = ongoingItems.filter(i => isMaturingSoon(i.maturity_date)).length;

    const totalInvested = ongoingItems.reduce((sum, i) => sum + i.invested_amount, 0);
    const totalExpected = ongoingItems.reduce((sum, i) => sum + i.expected_withdrawal, 0);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newInvested || !newRate || !newMaturityDate) return;

        try {
            await createFixedReturn(
                newName,
                parseFloat(newInvested),
                parseFloat(newRate),
                newStartDate,
                newMaturityDate,
                newNotes || undefined
            );
            setNewName("");
            setNewInvested("");
            setNewRate("");
            setNewStartDate(new Date().toISOString().split('T')[0]);
            setNewMaturityDate("");
            setNewNotes("");
            setIsCreating(false);
            loadData();
        } catch (err) {
            alert("Failed to create");
        }
    };

    const startEdit = (item: FixedReturn) => {
        setEditingId(item.id);
        setEditName(item.name);
        setEditInvested(item.invested_amount.toString());
        setEditRate(item.interest_rate.toString());
        setEditStartDate(item.start_date);
        setEditMaturityDate(item.maturity_date);
        setEditNotes(item.notes || "");
    };

    const cancelEdit = () => {
        setEditingId(null);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingId) return;

        try {
            await updateFixedReturn(
                editingId,
                editName,
                parseFloat(editInvested),
                parseFloat(editRate),
                editStartDate,
                editMaturityDate,
                editNotes || undefined
            );
            setEditingId(null);
            loadData();
        } catch (err) {
            alert("Failed to update");
        }
    };

    const openCloseModal = (item: FixedReturn) => {
        setClosingItem(item);
        setCloseWithdrawal(item.expected_withdrawal.toFixed(2));
        setCloseDate(new Date().toISOString().split('T')[0]);
    };

    const handleClose = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!closingItem) return;

        try {
            await closeFixedReturn(
                closingItem.id,
                parseFloat(closeWithdrawal),
                closeDate
            );
            setClosingItem(null);
            loadData();
        } catch (err) {
            alert("Failed to close");
        }
    };

    const startEditClosed = (item: FixedReturn) => {
        setEditingClosedId(item.id);
        setEditClosedWithdrawal(item.actual_withdrawal?.toString() || "");
        setEditClosedDate(item.closed_date || "");
        setEditClosedNotes(item.notes || "");
    };

    const handleUpdateClosed = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingClosedId) return;

        try {
            await updateClosedFixedReturn(
                editingClosedId,
                parseFloat(editClosedWithdrawal),
                editClosedDate,
                editClosedNotes || undefined
            );
            setEditingClosedId(null);
            loadData();
        } catch (err) {
            alert("Failed to update");
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteFixedReturn(id);
            setDeletingId(null);
            loadData();
        } catch (err) {
            alert("Failed to delete");
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    // Notes/Reflection functions
    const startEditNote = (year: string) => {
        setEditingNoteYear(year);
        setNoteValue(fdNotes[year] || '');
    };

    const saveNote = () => {
        if (!editingNoteYear) return;
        const newNotes = { ...fdNotes };
        if (noteValue.trim()) {
            newNotes[editingNoteYear] = noteValue.trim();
        } else {
            delete newNotes[editingNoteYear];
        }
        setFdNotes(newNotes);
        saveFixedReturnsNotes(newNotes);
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

                    {/* Export button */}
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
                    {/* Maturity Alert */}
                    {maturingSoonCount > 0 && (
                        <div style={{
                            padding: '8px 16px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ fontSize: '1.1rem' }}>!</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'rgb(245, 158, 11)' }}>
                                {maturingSoonCount} maturing within 30 days
                            </span>
                        </div>
                    )}
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Invested</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-primary)' }}>
                            {formatCurrency(totalInvested)}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Expected Returns</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-success)' }}>
                            {formatCurrency(totalExpected)}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Ongoing</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                            {ongoingItems.length}
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
                            <th style={{ textAlign: 'right', padding: '16px', fontSize: '0.85rem', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>Invested</th>
                            <th style={{ textAlign: 'right', padding: '16px', fontSize: '0.85rem', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>Rate %</th>
                            <th style={{ textAlign: 'left', padding: '16px', fontSize: '0.85rem', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>Maturity</th>
                            <th style={{ textAlign: 'right', padding: '16px', fontSize: '0.85rem', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>Expected</th>
                            <th style={{ textAlign: 'left', padding: '16px', fontSize: '0.85rem', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>Notes</th>
                            <th style={{ width: '180px', padding: '16px', borderBottom: '1px solid var(--border-color)' }}></th>
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
                                        <input type="number" value={editInvested} onChange={e => setEditInvested(e.target.value)} style={{ width: '100px', textAlign: 'right' }} />
                                    </td>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                                        <input type="number" step="0.01" value={editRate} onChange={e => setEditRate(e.target.value)} style={{ width: '70px', textAlign: 'right' }} />
                                    </td>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Start</div>
                                        <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} style={{ width: '130px', marginBottom: '4px' }} />
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Maturity</div>
                                        <input type="date" value={editMaturityDate} onChange={e => setEditMaturityDate(e.target.value)} style={{ width: '130px' }} />
                                    </td>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        (auto)
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
                                <tr key={item.id} style={isMaturingSoon(item.maturity_date) ? { background: 'rgba(245, 158, 11, 0.08)' } : {}}>
                                    <td style={{ padding: '16px', fontWeight: '500', borderBottom: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {item.name}
                                            {isMaturingSoon(item.maturity_date) && (
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    padding: '2px 6px',
                                                    background: 'rgba(245, 158, 11, 0.2)',
                                                    color: 'rgb(180, 120, 20)',
                                                    borderRadius: '4px',
                                                    fontWeight: '600'
                                                }}>
                                                    {getDaysUntilMaturity(item.maturity_date) <= 0 ? 'MATURED' : `${getDaysUntilMaturity(item.maturity_date)}d`}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-color)' }}>
                                        {formatCurrency(item.invested_amount)}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>
                                        {item.interest_rate.toFixed(2)}%
                                    </td>
                                    <td style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', color: isMaturingSoon(item.maturity_date) ? 'rgb(180, 120, 20)' : 'inherit', fontWeight: isMaturingSoon(item.maturity_date) ? '600' : 'normal' }}>
                                        {formatDate(item.maturity_date)}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: 'var(--accent-success)', borderBottom: '1px solid var(--border-color)' }}>
                                        {formatCurrency(item.expected_withdrawal)}
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {item.notes || '-'}
                                    </td>
                                    <td style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => startEdit(item)}
                                                style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-primary)' }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => openCloseModal(item)}
                                                style={{ padding: '6px 12px', background: 'var(--accent-success)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                                            >
                                                Close
                                            </button>
                                            {deletingId === item.id ? (
                                                <>
                                                    <button onClick={() => handleDelete(item.id)} style={{ padding: '6px 12px', background: 'var(--accent-danger)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Yes</button>
                                                    <button onClick={() => setDeletingId(null)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-primary)' }}>No</button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => setDeletingId(item.id)}
                                                    style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--accent-danger)', color: 'var(--accent-danger)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                                                >
                                                    Del
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        ))}

                        {/* Separator if both sections have items */}
                        {ongoingItems.length > 0 && closedItems.length > 0 && (
                            <tr>
                                <td colSpan={7} style={{ padding: '16px', background: 'var(--bg-panel)', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                    Closed / Matured
                                </td>
                            </tr>
                        )}

                        {/* Closed Items */}
                        {closedItems.map(item => (
                            editingClosedId === item.id ? (
                                <tr key={item.id} style={{ background: 'rgba(99, 102, 241, 0.05)', opacity: 0.8 }}>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>{item.name}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>{formatCurrency(item.invested_amount)}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>{item.interest_rate.toFixed(2)}%</td>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                                        <input type="date" value={editClosedDate} onChange={e => setEditClosedDate(e.target.value)} />
                                    </td>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                                        <input type="number" value={editClosedWithdrawal} onChange={e => setEditClosedWithdrawal(e.target.value)} style={{ width: '100px', textAlign: 'right' }} />
                                    </td>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                                        <input type="text" value={editClosedNotes} onChange={e => setEditClosedNotes(e.target.value)} style={{ width: '100%' }} />
                                    </td>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={handleUpdateClosed} style={{ padding: '6px 12px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Save</button>
                                            <button onClick={() => setEditingClosedId(null)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-primary)' }}>Cancel</button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                <tr key={item.id} style={{ opacity: 0.6 }}>
                                    <td style={{ padding: '16px', fontWeight: '500', borderBottom: '1px solid var(--border-color)' }}>{item.name}</td>
                                    <td style={{ padding: '16px', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>
                                        {formatCurrency(item.invested_amount)}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>
                                        {item.interest_rate.toFixed(2)}%
                                    </td>
                                    <td style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
                                        {item.closed_date ? formatDate(item.closed_date) : formatDate(item.maturity_date)}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>
                                        {formatCurrency(item.actual_withdrawal || 0)}
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                                        {item.notes || '-'}
                                    </td>
                                    <td style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => startEditClosed(item)}
                                                style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-primary)' }}
                                            >
                                                Edit
                                            </button>
                                            {deletingId === item.id ? (
                                                <>
                                                    <button onClick={() => handleDelete(item.id)} style={{ padding: '6px 12px', background: 'var(--accent-danger)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Yes</button>
                                                    <button onClick={() => setDeletingId(null)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-primary)' }}>No</button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => setDeletingId(item.id)}
                                                    style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--accent-danger)', color: 'var(--accent-danger)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                                                >
                                                    Del
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
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
                        <span style={{ fontSize: '1.2rem' }}>+</span> Add Fixed Return
                    </div>
                ) : (
                    <form onSubmit={handleCreate} style={{ padding: '16px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-panel)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px 130px 130px 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Name</label>
                                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g., SBI FD" autoFocus />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Invested</label>
                                <input type="number" value={newInvested} onChange={e => setNewInvested(e.target.value)} placeholder="50000" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Rate %</label>
                                <input type="number" step="0.01" value={newRate} onChange={e => setNewRate(e.target.value)} placeholder="7.5" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Start Date</label>
                                <input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Maturity Date</label>
                                <input type="date" value={newMaturityDate} onChange={e => setNewMaturityDate(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Notes</label>
                                <input type="text" value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Optional" />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button type="button" onClick={() => { setIsCreating(false); setNewName(""); setNewInvested(""); setNewRate(""); setNewStartDate(new Date().toISOString().split('T')[0]); setNewMaturityDate(""); setNewNotes(""); }} style={{ padding: '8px 12px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
                                <button type="submit" style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Add</button>
                            </div>
                        </div>
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
                                {FD_REFLECTION_PROMPTS.map((prompt, idx) => (
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
                                                {fdNotes[year] ? 'Edit' : 'Add Notes'}
                                            </button>
                                        )}
                                    </div>

                                    {editingNoteYear === year ? (
                                        <div>
                                            <textarea
                                                value={noteValue}
                                                onChange={e => setNoteValue(e.target.value)}
                                                onKeyDown={handleNoteKeyDown}
                                                placeholder="Write your FD reflections for this year..."
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
                                            color: fdNotes[year] ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            lineHeight: '1.6',
                                            whiteSpace: 'pre-wrap',
                                            minHeight: '60px'
                                        }}>
                                            {fdNotes[year] || 'No notes yet. Click "Add Notes" to write your reflections.'}
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
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                    Expected: {formatCurrency(closingItem.expected_withdrawal)}
                                </label>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px' }}>Actual Withdrawal Amount</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={closeWithdrawal}
                                    onChange={e => setCloseWithdrawal(e.target.value)}
                                    style={{ width: '100%', fontSize: '1.25rem', fontWeight: '600' }}
                                    autoFocus
                                />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px' }}>Closed Date</label>
                                <input
                                    type="date"
                                    value={closeDate}
                                    onChange={e => setCloseDate(e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setClosingItem(null)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
                                <button type="submit" style={{ padding: '10px 24px', background: 'var(--accent-success)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Close Investment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
