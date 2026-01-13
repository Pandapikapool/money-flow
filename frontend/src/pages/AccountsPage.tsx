import { useState, useEffect, useRef } from "react";
import { fetchAccounts, createAccount, updateAccount, deleteAccount, fetchAccountHistory, updateHistoryEntry, createHistoryEntry, deleteHistoryEntry, type Account, type AccountHistory } from "../lib/api";
import { formatCurrency } from "../lib/format";
import AccountHistoryGraph from "../components/AccountHistoryGraph";

// Load notes from localStorage
function getAccountsNotes(): Record<string, string> {
    try {
        const saved = localStorage.getItem('accounts_notes');
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
}

// Save notes to localStorage
function saveAccountsNotes(notes: Record<string, string>) {
    localStorage.setItem('accounts_notes', JSON.stringify(notes));
}

// Reflection prompts for Accounts
const ACCOUNTS_REFLECTION_PROMPTS = [
    "Am I maintaining enough emergency fund (3-6 months expenses)?",
    "Is my money earning optimal interest in savings accounts?",
    "Should I move idle money to better-yielding accounts?",
    "Am I tracking all my accounts accurately?",
    "Do I have too many dormant accounts to consolidate?",
    "What's my liquidity strategy for the coming year?"
];

export default function AccountsPage() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);

    // Create State
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState("");
    const [newBalance, setNewBalance] = useState("");

    // Detail/Edit Modal State
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [history, setHistory] = useState<AccountHistory[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [showGraph, setShowGraph] = useState(false);

    // Edit Current State
    const [editBalance, setEditBalance] = useState("");
    const [editNotes, setEditNotes] = useState("");
    const [saving, setSaving] = useState(false);

    // Delete State
    const [confirmDelete, setConfirmDelete] = useState(false);

    // Edit History Entry State
    const [editHistoryEntry, setEditHistoryEntry] = useState<AccountHistory | null>(null);
    const [editHistDate, setEditHistDate] = useState("");
    const [editHistBalance, setEditHistBalance] = useState("");
    const [editHistNotes, setEditHistNotes] = useState("");

    // Bulk Edit State
    const [bulkEditMode, setBulkEditMode] = useState(false);
    const [bulkEdits, setBulkEdits] = useState<{ [id: number]: { date: string; balance: string; notes: string } }>({});
    const [newBulkRows, setNewBulkRows] = useState<{ date: string; balance: string; notes: string }[]>([]);

    // CSV Import State
    const [showImport, setShowImport] = useState(false);
    const [csvText, setCsvText] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Manual History Add State
    const [showAddHistory, setShowAddHistory] = useState(false);
    const [newHistDate, setNewHistDate] = useState("");
    const [newHistBalance, setNewHistBalance] = useState("");
    const [newHistNotes, setNewHistNotes] = useState("");

    // Graph Ref for Export
    const graphRef = useRef<HTMLDivElement>(null);

    // Notes & Reflection state
    const [accountsNotes, setAccountsNotes] = useState<Record<string, string>>(getAccountsNotes);
    const [notesExpanded, setNotesExpanded] = useState(false);
    const [editingNoteYear, setEditingNoteYear] = useState<string | null>(null);
    const [noteValue, setNoteValue] = useState("");
    const currentYear = new Date().getFullYear().toString();

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = () => {
        fetchAccounts()
            .then(setAccounts)
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName) return;

        try {
            await createAccount(newName, parseFloat(newBalance) || 0);
            setNewName("");
            setNewBalance("");
            setIsCreating(false);
            loadAccounts();
        } catch (err) {
            alert("Failed to create account");
        }
    };

    const openAccountDetails = async (acc: Account) => {
        setSelectedAccount(acc);
        setEditBalance(acc.balance.toString());
        setEditNotes(acc.notes || "");
        setShowGraph(false);
        setConfirmDelete(false);
        setBulkEditMode(false);
        setBulkEdits({});
        setShowImport(false);

        // Load History
        setLoadingHistory(true);
        fetchAccountHistory(acc.id)
            .then(setHistory)
            .catch(console.error)
            .finally(() => setLoadingHistory(false));
    };

    const closeDetails = () => {
        setSelectedAccount(null);
        setHistory([]);
        setEditHistoryEntry(null);
        setShowGraph(false);
        setBulkEditMode(false);
        setBulkEdits({});
        setShowImport(false);
    };

    const handleUpdateCurrent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAccount) return;

        setSaving(true);
        try {
            const updated = await updateAccount(selectedAccount.id, parseFloat(editBalance) || 0, editNotes);

            // Update local list
            setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a));

            // Refresh details
            setSelectedAccount(updated);
            // Reload history to show the new entry
            fetchAccountHistory(updated.id).then(setHistory);

        } catch (err) {
            alert("Failed to update account");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedAccount) return;
        try {
            await deleteAccount(selectedAccount.id);
            setAccounts(prev => prev.filter(a => a.id !== selectedAccount.id));
            closeDetails();
        } catch (err) {
            alert("Failed to delete account");
        }
    };

    const handlePointClick = (entry: AccountHistory) => {
        if (bulkEditMode) return; // Don't open single edit in bulk mode
        if (!entry || !entry.id) {
            alert("Error: Clicked entry has no ID.");
            return;
        }
        setEditHistoryEntry(entry);
        setEditHistDate(entry.date);
        setEditHistBalance(entry.balance.toString());
        setEditHistNotes(entry.notes || "");
    };

    const handleDeleteHistory = async () => {
        if (!editHistoryEntry) return;
        if (!confirm("Delete this history entry?")) return;

        try {
            await deleteHistoryEntry(editHistoryEntry.id);
            setHistory(prev => prev.filter(h => h.id !== editHistoryEntry.id));
            setEditHistoryEntry(null);
        } catch (err) {
            alert("Failed to delete history entry");
        }
    };

    const handleUpdateHistory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editHistoryEntry) return;

        try {
            const dateChanged = editHistDate !== editHistoryEntry.date;
            const updated = await updateHistoryEntry(
                editHistoryEntry.id,
                parseFloat(editHistBalance) || 0,
                editHistNotes,
                dateChanged ? editHistDate : undefined
            );
            setHistory(prev => prev.map(h => h.id === updated.id ? updated : h).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
            setEditHistoryEntry(null);
        } catch (err) {
            alert("Failed to update history entry");
        }
    };

    // Bulk Edit Functions
    const startBulkEdit = () => {
        setBulkEditMode(true);
        const edits: { [id: number]: { date: string; balance: string; notes: string } } = {};
        history.forEach(h => {
            edits[h.id] = { date: h.date, balance: h.balance.toString(), notes: h.notes || "" };
        });
        setBulkEdits(edits);
    };

    const cancelBulkEdit = () => {
        setBulkEditMode(false);
        setBulkEdits({});
        setNewBulkRows([]);
    };

    const addBulkRow = () => {
        setNewBulkRows(prev => [...prev, { date: new Date().toISOString().split('T')[0], balance: '', notes: '' }]);
    };

    const updateNewBulkRow = (index: number, field: string, value: string) => {
        setNewBulkRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
    };

    const removeNewBulkRow = (index: number) => {
        setNewBulkRows(prev => prev.filter((_, i) => i !== index));
    };

    const handleBulkSave = async () => {
        if (!selectedAccount) return;

        const updates = Object.entries(bulkEdits).map(async ([id, { date, balance, notes }]) => {
            const original = history.find(h => h.id === Number(id));
            if (original && (original.date !== date || original.balance.toString() !== balance || (original.notes || "") !== notes)) {
                const dateChanged = original.date !== date;
                return updateHistoryEntry(Number(id), parseFloat(balance) || 0, notes, dateChanged ? date : undefined);
            }
            return null;
        });

        // Create new rows
        const creates = newBulkRows
            .filter(row => row.date && row.balance)
            .map(row => createHistoryEntry(selectedAccount.id, row.date, parseFloat(row.balance) || 0, row.notes));

        try {
            await Promise.all([...updates, ...creates]);
            // Reload history
            const newHistory = await fetchAccountHistory(selectedAccount.id);
            setHistory(newHistory);
            setBulkEditMode(false);
            setBulkEdits({});
            setNewBulkRows([]);
        } catch (err) {
            alert("Failed to save some entries");
        }
    };

    // CSV Import Functions
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            setCsvText(text);
        };
        reader.readAsText(file);
    };

    const parseCSV = (text: string): { date: string; balance: number; notes: string }[] => {
        const lines = text.trim().split('\n');
        const results: { date: string; balance: number; notes: string }[] = [];

        // Skip header if present
        const startIndex = lines[0]?.toLowerCase().includes('date') ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Handle CSV with quoted fields
            const parts = line.match(/(".*?"|[^,]+)/g) || [];
            if (parts.length >= 2) {
                const date = (parts[0] || '').replace(/"/g, '').trim();
                const balance = parseFloat((parts[1] || '').replace(/"/g, '').trim()) || 0;
                const notes = parts[2]?.replace(/"/g, '').trim() || "";

                // Validate date format (YYYY-MM-DD)
                if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                    results.push({ date, balance, notes });
                }
            }
        }
        return results;
    };

    const handleImportCSV = async () => {
        if (!selectedAccount || !csvText.trim()) return;

        const entries = parseCSV(csvText);
        if (entries.length === 0) {
            alert("No valid entries found. Format: Date,Balance,Notes (YYYY-MM-DD)");
            return;
        }

        try {
            for (const entry of entries) {
                await createHistoryEntry(selectedAccount.id, entry.date, entry.balance, entry.notes);
            }

            // Reload history
            const newHistory = await fetchAccountHistory(selectedAccount.id);
            setHistory(newHistory);
            setShowImport(false);
            setCsvText("");
            alert(`Imported ${entries.length} entries`);
        } catch (err) {
            alert("Failed to import some entries");
        }
    };

    const handleExportCSV = () => {
        if (!history.length) return;

        const headers = "Date,Balance,Notes\n";
        const rows = history.map(h => `${h.date},${h.balance},"${(h.notes || '').replace(/"/g, '""')}"`).join("\n");
        const csvContent = "data:text/csv;charset=utf-8," + headers + rows;

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${selectedAccount?.name}_history.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    const handleCreateHistory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAccount || !newHistDate || !newHistBalance) return;

        try {
            const entry = await createHistoryEntry(selectedAccount.id, newHistDate, parseFloat(newHistBalance) || 0, newHistNotes);
            setHistory(prev => [...prev, entry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
            setNewHistDate("");
            setNewHistBalance("");
            setNewHistNotes("");
            setShowAddHistory(false);
        } catch (err) {
            alert("Failed to add history entry");
        }
    };

    const total = accounts.reduce((sum, a) => sum + a.balance, 0);

    // Notes/Reflection functions
    const startEditNote = (year: string) => {
        setEditingNoteYear(year);
        setNoteValue(accountsNotes[year] || '');
    };

    const saveNote = () => {
        if (!editingNoteYear) return;
        const newNotes = { ...accountsNotes };
        if (noteValue.trim()) {
            newNotes[editingNoteYear] = noteValue.trim();
        } else {
            delete newNotes[editingNoteYear];
        }
        setAccountsNotes(newNotes);
        saveAccountsNotes(newNotes);
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
        <div style={{ maxWidth: '1200px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: '600' }}>Accounts</h1>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net Liquidity</div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: total >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                        {formatCurrency(total)}
                    </div>
                </div>
            </div>

            {/* Account Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                {accounts.map(acc => (
                    <div
                        key={acc.id}
                        className="glass-panel"
                        style={{
                            padding: '20px',
                            cursor: 'pointer',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                        }}
                        onClick={() => openAccountDetails(acc)}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{acc.name}</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-primary)' }}>
                            {formatCurrency(acc.balance)}
                        </div>
                        {acc.notes && (
                            <div style={{
                                marginTop: '12px',
                                fontSize: '0.8rem',
                                color: 'var(--text-secondary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {acc.notes.split('\n')[0]}
                            </div>
                        )}
                    </div>
                ))}

                {/* Add Account Tile */}
                {!isCreating ? (
                    <div
                        className="glass-panel"
                        onClick={() => setIsCreating(true)}
                        style={{
                            minHeight: '120px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            cursor: 'pointer',
                            border: '2px dashed var(--border-color)',
                            background: 'transparent',
                            opacity: 0.6,
                            transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; }}
                    >
                        <div style={{ fontSize: '2.5rem', color: 'var(--text-secondary)' }}>+</div>
                    </div>
                ) : (
                    <div className="glass-panel" style={{ padding: '20px' }}>
                        <form onSubmit={handleCreate}>
                            <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '12px' }}>New Account</div>
                            <input
                                type="text"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="Account name"
                                style={{ marginBottom: '8px' }}
                                autoFocus
                            />
                            <input
                                type="number"
                                value={newBalance}
                                onChange={e => setNewBalance(e.target.value)}
                                placeholder="Initial balance"
                                style={{ marginBottom: '12px' }}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    style={{ flex: 1, padding: '8px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{ flex: 1, padding: '8px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                    Add
                                </button>
                            </div>
                        </form>
                    </div>
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
                                {ACCOUNTS_REFLECTION_PROMPTS.map((prompt, idx) => (
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
                                                {accountsNotes[year] ? 'Edit' : 'Add Notes'}
                                            </button>
                                        )}
                                    </div>

                                    {editingNoteYear === year ? (
                                        <div>
                                            <textarea
                                                value={noteValue}
                                                onChange={e => setNoteValue(e.target.value)}
                                                onKeyDown={handleNoteKeyDown}
                                                placeholder="Write your accounts reflections for this year..."
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
                                            color: accountsNotes[year] ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            lineHeight: '1.6',
                                            whiteSpace: 'pre-wrap',
                                            minHeight: '60px'
                                        }}>
                                            {accountsNotes[year] || 'No notes yet. Click "Add Notes" to write your reflections.'}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Account Details Modal */}
            {selectedAccount && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        padding: '20px', boxSizing: 'border-box'
                    }}
                    onClick={closeDetails}
                >
                    <div
                        style={{
                            width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto',
                            backgroundColor: 'var(--bg-app)', padding: '28px', borderRadius: '12px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{selectedAccount.name}</h2>
                            <button
                                onClick={closeDetails}
                                style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
                            >
                                &times;
                            </button>
                        </div>

                        {/* Update Form */}
                        <form onSubmit={handleUpdateCurrent} style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Current Balance</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editBalance}
                                        onChange={e => setEditBalance(e.target.value)}
                                        style={{ fontSize: '1.25rem', fontWeight: '600' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Notes / Description</label>
                                    <textarea
                                        value={editNotes}
                                        onChange={e => setEditNotes(e.target.value)}
                                        placeholder="Add notes here...&#10;- Use bullet points&#10;- Multiple lines supported"
                                        rows={4}
                                        style={{
                                            width: '100%',
                                            background: 'var(--input-bg)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px',
                                            padding: '12px',
                                            color: 'var(--text-primary)',
                                            resize: 'vertical',
                                            fontFamily: 'inherit',
                                            fontSize: '0.95rem',
                                            lineHeight: '1.5',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    style={{
                                        padding: '10px 24px',
                                        background: 'var(--accent-primary)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: '500'
                                    }}
                                >
                                    {saving ? 'Saving...' : 'Update'}
                                </button>

                                {!confirmDelete ? (
                                    <button
                                        type="button"
                                        onClick={() => setConfirmDelete(true)}
                                        style={{ color: 'var(--accent-danger)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                                    >
                                        Delete Account
                                    </button>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--accent-danger)' }}>Sure?</span>
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            style={{ background: 'var(--accent-danger)', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer' }}
                                        >
                                            Yes, Delete
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setConfirmDelete(false)}
                                            style={{ background: 'transparent', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-primary)' }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                        </form>

                        <hr style={{ borderColor: 'var(--border-color)', margin: '24px 0', opacity: 0.3 }} />

                        {/* History & Trends Section */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>History & Trends</h3>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {showGraph && !bulkEditMode && (
                                    <>
                                        <button
                                            onClick={() => setShowAddHistory(!showAddHistory)}
                                            style={{ fontSize: '0.8rem', padding: '6px 12px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                        >
                                            {showAddHistory ? 'Cancel' : '+ Add Entry'}
                                        </button>
                                        <button
                                            onClick={startBulkEdit}
                                            style={{ fontSize: '0.8rem', padding: '6px 12px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)' }}
                                        >
                                            Bulk Edit
                                        </button>
                                        <button
                                            onClick={() => setShowImport(!showImport)}
                                            style={{ fontSize: '0.8rem', padding: '6px 12px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)' }}
                                        >
                                            {showImport ? 'Cancel Import' : 'Import CSV'}
                                        </button>
                                        <button
                                            onClick={handleExportCSV}
                                            style={{ fontSize: '0.8rem', padding: '6px 12px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)' }}
                                        >
                                            Export CSV
                                        </button>
                                    </>
                                )}
                                {bulkEditMode && (
                                    <>
                                        <button
                                            onClick={handleBulkSave}
                                            style={{ fontSize: '0.8rem', padding: '6px 12px', background: 'var(--accent-success)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                        >
                                            Save All
                                        </button>
                                        <button
                                            onClick={cancelBulkEdit}
                                            style={{ fontSize: '0.8rem', padding: '6px 12px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)' }}
                                        >
                                            Cancel
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => { setShowGraph(!showGraph); setBulkEditMode(false); setShowImport(false); }}
                                    style={{
                                        fontSize: '0.8rem', padding: '6px 12px',
                                        background: showGraph ? 'var(--accent-primary)' : 'var(--bg-panel)',
                                        color: showGraph ? '#fff' : 'var(--text-primary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {showGraph ? 'Hide' : 'Show Trends'}
                                </button>
                            </div>
                        </div>

                        {showGraph && (
                            <div>
                                {/* CSV Import Form */}
                                {showImport && (
                                    <div style={{
                                        marginBottom: '16px', padding: '16px', borderRadius: '8px',
                                        border: '1px dashed var(--accent-primary)', backgroundColor: 'rgba(99, 102, 241, 0.05)'
                                    }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: '500', marginBottom: '12px' }}>Import CSV</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                                            Format: Date,Balance,Notes (Date as YYYY-MM-DD)
                                        </div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".csv"
                                            onChange={handleFileSelect}
                                            style={{ marginBottom: '12px' }}
                                        />
                                        <textarea
                                            value={csvText}
                                            onChange={e => setCsvText(e.target.value)}
                                            placeholder="Or paste CSV content here..."
                                            rows={4}
                                            style={{
                                                width: '100%',
                                                background: 'var(--input-bg)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '6px',
                                                padding: '10px',
                                                color: 'var(--text-primary)',
                                                fontFamily: 'monospace',
                                                fontSize: '0.85rem',
                                                marginBottom: '12px',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                        <button
                                            onClick={handleImportCSV}
                                            style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                        >
                                            Import
                                        </button>
                                    </div>
                                )}

                                {/* Add Entry Form */}
                                {showAddHistory && !bulkEditMode && (
                                    <form onSubmit={handleCreateHistory} style={{
                                        marginBottom: '16px', padding: '16px', borderRadius: '8px',
                                        border: '1px dashed var(--accent-primary)', backgroundColor: 'rgba(99, 102, 241, 0.05)'
                                    }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: '500', marginBottom: '12px' }}>Add Entry</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '140px 140px 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Date</label>
                                                <input
                                                    type="date"
                                                    value={newHistDate}
                                                    onChange={e => setNewHistDate(e.target.value)}
                                                    required
                                                    style={{ padding: '8px' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Balance</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={newHistBalance}
                                                    onChange={e => setNewHistBalance(e.target.value)}
                                                    required
                                                    placeholder="0.00"
                                                    style={{ padding: '8px' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Notes</label>
                                                <input
                                                    type="text"
                                                    value={newHistNotes}
                                                    onChange={e => setNewHistNotes(e.target.value)}
                                                    placeholder="Optional"
                                                    style={{ padding: '8px' }}
                                                />
                                            </div>
                                            <button type="submit" style={{ height: '38px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '4px', padding: '0 16px', cursor: 'pointer' }}>Add</button>
                                        </div>
                                    </form>
                                )}

                                {loadingHistory ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading history...</div>
                                ) : (
                                    <>
                                        {/* Graph */}
                                        {!bulkEditMode && (
                                            <div ref={graphRef} style={{ background: 'var(--bg-panel)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                                                <AccountHistoryGraph data={history} onPointClick={handlePointClick} />
                                            </div>
                                        )}

                                        {/* Bulk Edit Table */}
                                        {bulkEditMode && (
                                            <div style={{ background: 'var(--bg-panel)', padding: '16px', borderRadius: '8px', marginBottom: '16px', maxHeight: '400px', overflowY: 'auto' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                    <thead>
                                                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                            <th style={{ textAlign: 'left', padding: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Date</th>
                                                            <th style={{ textAlign: 'left', padding: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Balance</th>
                                                            <th style={{ textAlign: 'left', padding: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Notes</th>
                                                            <th style={{ width: '40px' }}></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {history.map(h => (
                                                            <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                                <td style={{ padding: '8px' }}>
                                                                    <input
                                                                        type="date"
                                                                        value={bulkEdits[h.id]?.date || ''}
                                                                        onChange={e => setBulkEdits(prev => ({ ...prev, [h.id]: { ...prev[h.id], date: e.target.value } }))}
                                                                        style={{ padding: '6px' }}
                                                                    />
                                                                </td>
                                                                <td style={{ padding: '8px' }}>
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={bulkEdits[h.id]?.balance || ''}
                                                                        onChange={e => setBulkEdits(prev => ({ ...prev, [h.id]: { ...prev[h.id], balance: e.target.value } }))}
                                                                        style={{ width: '120px', padding: '6px' }}
                                                                    />
                                                                </td>
                                                                <td style={{ padding: '8px' }}>
                                                                    <input
                                                                        type="text"
                                                                        value={bulkEdits[h.id]?.notes || ''}
                                                                        onChange={e => setBulkEdits(prev => ({ ...prev, [h.id]: { ...prev[h.id], notes: e.target.value } }))}
                                                                        style={{ width: '100%', padding: '6px' }}
                                                                    />
                                                                </td>
                                                                <td></td>
                                                            </tr>
                                                        ))}
                                                        {/* New rows */}
                                                        {newBulkRows.map((row, index) => (
                                                            <tr key={`new-${index}`} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                                                                <td style={{ padding: '8px' }}>
                                                                    <input
                                                                        type="date"
                                                                        value={row.date}
                                                                        onChange={e => updateNewBulkRow(index, 'date', e.target.value)}
                                                                        style={{ padding: '6px' }}
                                                                    />
                                                                </td>
                                                                <td style={{ padding: '8px' }}>
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={row.balance}
                                                                        onChange={e => updateNewBulkRow(index, 'balance', e.target.value)}
                                                                        placeholder="0.00"
                                                                        style={{ width: '120px', padding: '6px' }}
                                                                    />
                                                                </td>
                                                                <td style={{ padding: '8px' }}>
                                                                    <input
                                                                        type="text"
                                                                        value={row.notes}
                                                                        onChange={e => updateNewBulkRow(index, 'notes', e.target.value)}
                                                                        placeholder="Notes"
                                                                        style={{ width: '100%', padding: '6px' }}
                                                                    />
                                                                </td>
                                                                <td style={{ padding: '8px' }}>
                                                                    <button
                                                                        onClick={() => removeNewBulkRow(index)}
                                                                        style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', fontSize: '1.2rem', padding: '0' }}
                                                                    >
                                                                        &times;
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                <button
                                                    onClick={addBulkRow}
                                                    style={{
                                                        marginTop: '12px',
                                                        padding: '8px 16px',
                                                        background: 'transparent',
                                                        border: '1px dashed var(--accent-primary)',
                                                        borderRadius: '4px',
                                                        color: 'var(--accent-primary)',
                                                        cursor: 'pointer',
                                                        fontSize: '0.85rem',
                                                        width: '100%'
                                                    }}
                                                >
                                                    + Add Row
                                                </button>
                                            </div>
                                        )}

                                        {/* Single Entry Edit (from graph click) */}
                                        {editHistoryEntry && !bulkEditMode && (
                                            <div style={{
                                                padding: '16px', marginBottom: '16px',
                                                border: '1px solid var(--border-color)', borderRadius: '8px',
                                                backgroundColor: 'var(--bg-panel)'
                                            }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: '500', marginBottom: '12px' }}>Edit Entry</div>
                                                <form onSubmit={handleUpdateHistory} style={{ display: 'grid', gridTemplateColumns: '140px 140px 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Date</label>
                                                        <input
                                                            type="date"
                                                            value={editHistDate}
                                                            onChange={e => setEditHistDate(e.target.value)}
                                                            style={{ padding: '8px' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Balance</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={editHistBalance}
                                                            onChange={e => setEditHistBalance(e.target.value)}
                                                            style={{ padding: '8px' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Notes</label>
                                                        <input
                                                            type="text"
                                                            value={editHistNotes}
                                                            onChange={e => setEditHistNotes(e.target.value)}
                                                            style={{ padding: '8px' }}
                                                        />
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button type="submit" style={{ padding: '8px 12px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
                                                        <button type="button" onClick={handleDeleteHistory} style={{ padding: '8px 12px', background: 'var(--accent-danger)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                                                        <button type="button" onClick={() => setEditHistoryEntry(null)} style={{ padding: '8px 12px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
                                                    </div>
                                                </form>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
