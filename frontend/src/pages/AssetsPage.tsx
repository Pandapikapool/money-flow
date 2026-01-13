import { useState, useEffect, useRef } from "react";
import { fetchAssets, createAsset, updateAsset, deleteAsset, fetchAssetHistory, createAssetHistoryEntry, updateAssetHistoryEntry, deleteAssetHistoryEntry, type Asset, type AssetHistory } from "../lib/api";
import { formatCurrency } from "../lib/format";
import AssetHistoryGraph from "../components/AssetHistoryGraph";

interface Props {
    title: string;
    type: string;
}

export default function AssetsPage({ title, type }: Props) {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);

    // Create State
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState("");
    const [newValue, setNewValue] = useState("");
    const [newNotes, setNewNotes] = useState("");

    // Detail/Edit Modal State
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [history, setHistory] = useState<AssetHistory[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [showGraph, setShowGraph] = useState(false);

    // Edit Current State
    const [editValue, setEditValue] = useState("");
    const [editNotes, setEditNotes] = useState("");
    const [saving, setSaving] = useState(false);

    // Delete State
    const [confirmDelete, setConfirmDelete] = useState(false);

    // Edit History Entry State
    const [editHistoryEntry, setEditHistoryEntry] = useState<AssetHistory | null>(null);
    const [editHistDate, setEditHistDate] = useState("");
    const [editHistValue, setEditHistValue] = useState("");
    const [editHistNotes, setEditHistNotes] = useState("");

    // Bulk Edit State
    const [bulkEditMode, setBulkEditMode] = useState(false);
    const [bulkEdits, setBulkEdits] = useState<{ [id: number]: { date: string; value: string; notes: string } }>({});
    const [newBulkRows, setNewBulkRows] = useState<{ date: string; value: string; notes: string }[]>([]);

    // CSV Import State
    const [showImport, setShowImport] = useState(false);
    const [csvText, setCsvText] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Manual History Add State
    const [showAddHistory, setShowAddHistory] = useState(false);
    const [newHistDate, setNewHistDate] = useState("");
    const [newHistValue, setNewHistValue] = useState("");
    const [newHistNotes, setNewHistNotes] = useState("");

    // Graph Ref for Export
    const graphRef = useRef<HTMLDivElement>(null);

    // View Mode - investments default to table, assets to tiles
    const [viewMode, setViewMode] = useState<'tiles' | 'table'>(type === 'investment' ? 'table' : 'tiles');

    useEffect(() => {
        loadAssets();
        // Reset view mode when type changes
        setViewMode(type === 'investment' ? 'table' : 'tiles');
    }, [type]);

    const loadAssets = () => {
        setLoading(true);
        fetchAssets(type)
            .then(setAssets)
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName) return;

        try {
            await createAsset(newName, parseFloat(newValue) || 0, type, newNotes);
            setNewName("");
            setNewValue("");
            setNewNotes("");
            setIsCreating(false);
            loadAssets();
        } catch (err) {
            alert("Failed to create item");
        }
    };

    const openAssetDetails = async (asset: Asset) => {
        setSelectedAsset(asset);
        setEditValue(asset.value.toString());
        setEditNotes(asset.notes || "");
        setShowGraph(false);
        setConfirmDelete(false);
        setBulkEditMode(false);
        setBulkEdits({});
        setShowImport(false);

        // Load History
        setLoadingHistory(true);
        fetchAssetHistory(asset.id)
            .then(setHistory)
            .catch(console.error)
            .finally(() => setLoadingHistory(false));
    };

    const closeDetails = () => {
        setSelectedAsset(null);
        setHistory([]);
        setEditHistoryEntry(null);
        setShowGraph(false);
        setBulkEditMode(false);
        setBulkEdits({});
        setShowImport(false);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAsset) return;

        setSaving(true);
        try {
            const updated = await updateAsset(selectedAsset.id, parseFloat(editValue) || 0, editNotes);
            setAssets(prev => prev.map(a => a.id === updated.id ? updated : a));
            setSelectedAsset(updated);
            // Reload history to show new entry
            fetchAssetHistory(updated.id).then(setHistory);
        } catch (err) {
            alert("Failed to update");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedAsset) return;
        try {
            await deleteAsset(selectedAsset.id);
            setAssets(prev => prev.filter(a => a.id !== selectedAsset.id));
            closeDetails();
        } catch (err) {
            alert("Failed to delete");
        }
    };

    const handlePointClick = (entry: AssetHistory) => {
        if (bulkEditMode) return;
        if (!entry || !entry.id) {
            alert("Error: Clicked entry has no ID.");
            return;
        }
        setEditHistoryEntry(entry);
        setEditHistDate(entry.date);
        setEditHistValue(entry.value.toString());
        setEditHistNotes(entry.notes || "");
    };

    const handleDeleteHistory = async () => {
        if (!editHistoryEntry) return;
        if (!confirm("Delete this history entry?")) return;

        try {
            await deleteAssetHistoryEntry(editHistoryEntry.id);
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
            const updated = await updateAssetHistoryEntry(
                editHistoryEntry.id,
                parseFloat(editHistValue) || 0,
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
        const edits: { [id: number]: { date: string; value: string; notes: string } } = {};
        history.forEach(h => {
            edits[h.id] = { date: h.date, value: h.value.toString(), notes: h.notes || "" };
        });
        setBulkEdits(edits);
    };

    const cancelBulkEdit = () => {
        setBulkEditMode(false);
        setBulkEdits({});
        setNewBulkRows([]);
    };

    const addBulkRow = () => {
        setNewBulkRows(prev => [...prev, { date: new Date().toISOString().split('T')[0], value: '', notes: '' }]);
    };

    const updateNewBulkRow = (index: number, field: string, val: string) => {
        setNewBulkRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: val } : row));
    };

    const removeNewBulkRow = (index: number) => {
        setNewBulkRows(prev => prev.filter((_, i) => i !== index));
    };

    const handleBulkSave = async () => {
        if (!selectedAsset) return;

        const updates = Object.entries(bulkEdits).map(async ([id, { date, value, notes }]) => {
            const original = history.find(h => h.id === Number(id));
            if (original && (original.date !== date || original.value.toString() !== value || (original.notes || "") !== notes)) {
                const dateChanged = original.date !== date;
                return updateAssetHistoryEntry(Number(id), parseFloat(value) || 0, notes, dateChanged ? date : undefined);
            }
            return null;
        });

        // Create new rows
        const creates = newBulkRows
            .filter(row => row.date && row.value)
            .map(row => createAssetHistoryEntry(selectedAsset.id, row.date, parseFloat(row.value) || 0, row.notes));

        try {
            await Promise.all([...updates, ...creates]);
            const newHistory = await fetchAssetHistory(selectedAsset.id);
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

    const parseCSV = (text: string): { date: string; value: number; notes: string }[] => {
        const lines = text.trim().split('\n');
        const results: { date: string; value: number; notes: string }[] = [];

        const startIndex = lines[0]?.toLowerCase().includes('date') ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.match(/(".*?"|[^,]+)/g) || [];
            if (parts.length >= 2) {
                const date = (parts[0] || '').replace(/"/g, '').trim();
                const value = parseFloat((parts[1] || '').replace(/"/g, '').trim()) || 0;
                const notes = parts[2]?.replace(/"/g, '').trim() || "";

                if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                    results.push({ date, value, notes });
                }
            }
        }
        return results;
    };

    const handleImportCSV = async () => {
        if (!selectedAsset || !csvText.trim()) return;

        const entries = parseCSV(csvText);
        if (entries.length === 0) {
            alert("No valid entries found. Format: Date,Value,Notes (YYYY-MM-DD)");
            return;
        }

        try {
            for (const entry of entries) {
                await createAssetHistoryEntry(selectedAsset.id, entry.date, entry.value, entry.notes);
            }

            const newHistory = await fetchAssetHistory(selectedAsset.id);
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

        const headers = "Date,Value,Notes\n";
        const rows = history.map(h => `${h.date},${h.value},"${(h.notes || '').replace(/"/g, '""')}"`).join("\n");
        const csvContent = "data:text/csv;charset=utf-8," + headers + rows;

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${selectedAsset?.name}_history.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCreateHistory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAsset || !newHistDate || !newHistValue) return;

        try {
            const entry = await createAssetHistoryEntry(selectedAsset.id, newHistDate, parseFloat(newHistValue) || 0, newHistNotes);
            setHistory(prev => [...prev, entry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
            setNewHistDate("");
            setNewHistValue("");
            setNewHistNotes("");
            setShowAddHistory(false);
        } catch (err) {
            alert("Failed to add history entry");
        }
    };

    const total = assets.reduce((sum, a) => sum + a.value, 0);

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

    return (
        <div style={{ maxWidth: '1200px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: '600', margin: 0 }}>{title}</h1>
                    {/* View Toggle */}
                    <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-panel)', padding: '4px', borderRadius: '8px' }}>
                        <button
                            onClick={() => setViewMode('table')}
                            style={{
                                padding: '6px 12px',
                                background: viewMode === 'table' ? 'var(--accent-primary)' : 'transparent',
                                color: viewMode === 'table' ? '#fff' : 'var(--text-secondary)',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: '500'
                            }}
                        >
                            Table
                        </button>
                        <button
                            onClick={() => setViewMode('tiles')}
                            style={{
                                padding: '6px 12px',
                                background: viewMode === 'tiles' ? 'var(--accent-primary)' : 'transparent',
                                color: viewMode === 'tiles' ? '#fff' : 'var(--text-secondary)',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: '500'
                            }}
                        >
                            Tiles
                        </button>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Value</div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--accent-success)' }}>
                        {formatCurrency(total)}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{assets.length} items</div>
                </div>
            </div>

            {/* Table View */}
            {viewMode === 'table' && (
                <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-panel)' }}>
                                <th style={{ textAlign: 'left', padding: '16px', fontSize: '0.85rem', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>Name</th>
                                <th style={{ textAlign: 'right', padding: '16px', fontSize: '0.85rem', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>Value</th>
                                <th style={{ textAlign: 'left', padding: '16px', fontSize: '0.85rem', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>Notes</th>
                                <th style={{ width: '100px', padding: '16px', borderBottom: '1px solid var(--border-color)' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {assets.map(asset => (
                                <tr
                                    key={asset.id}
                                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                                    onClick={() => openAssetDetails(asset)}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-panel)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <td style={{ padding: '16px', fontWeight: '500', borderBottom: '1px solid var(--border-color)' }}>
                                        {asset.name}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right', fontWeight: '700', color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-color)' }}>
                                        {formatCurrency(asset.value)}
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {asset.notes?.split('\n')[0] || '-'}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openAssetDetails(asset); }}
                                            style={{
                                                padding: '6px 12px',
                                                background: 'transparent',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '0.75rem',
                                                color: 'var(--text-primary)'
                                            }}
                                        >
                                            Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: 'var(--bg-panel)' }}>
                                <td style={{ padding: '16px', fontWeight: '600' }}>Total</td>
                                <td style={{ padding: '16px', textAlign: 'right', fontWeight: '700', fontSize: '1.1rem', color: 'var(--accent-success)' }}>
                                    {formatCurrency(total)}
                                </td>
                                <td colSpan={2}></td>
                            </tr>
                        </tfoot>
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
                            <span style={{ fontSize: '1.2rem' }}>+</span> Add {title.replace(/s$/, '')}
                        </div>
                    ) : (
                        <form onSubmit={handleCreate} style={{ padding: '16px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-panel)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '12px', alignItems: 'flex-end' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Name</label>
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        placeholder="Name"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Value</label>
                                    <input
                                        type="number"
                                        value={newValue}
                                        onChange={e => setNewValue(e.target.value)}
                                        placeholder="Value"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Notes</label>
                                    <input
                                        type="text"
                                        value={newNotes}
                                        onChange={e => setNewNotes(e.target.value)}
                                        placeholder="Notes (optional)"
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={() => { setIsCreating(false); setNewName(""); setNewValue(""); setNewNotes(""); }}
                                        style={{ padding: '8px 12px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            )}

            {/* Tiles View */}
            {viewMode === 'tiles' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                    {assets.map(asset => (
                        <div
                            key={asset.id}
                            className="glass-panel"
                            style={{
                                padding: '20px',
                                cursor: 'pointer',
                                transition: 'transform 0.15s, box-shadow 0.15s',
                            }}
                            onClick={() => openAssetDetails(asset)}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{asset.name}</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-primary)' }}>
                                {formatCurrency(asset.value)}
                            </div>
                            {asset.notes && (
                                <div style={{
                                    marginTop: '12px',
                                    fontSize: '0.8rem',
                                    color: 'var(--text-secondary)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    {asset.notes.split('\n')[0]}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Add Asset Tile */}
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
                                <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '12px' }}>New {title.replace(/s$/, '')}</div>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="Name"
                                    style={{ marginBottom: '8px' }}
                                    autoFocus
                                />
                                <input
                                    type="number"
                                    value={newValue}
                                    onChange={e => setNewValue(e.target.value)}
                                    placeholder="Value"
                                    style={{ marginBottom: '8px' }}
                                />
                                <textarea
                                    value={newNotes}
                                    onChange={e => setNewNotes(e.target.value)}
                                    placeholder="Notes (optional)"
                                    rows={2}
                                    style={{
                                        width: '100%',
                                        marginBottom: '12px',
                                        background: 'var(--input-bg)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        color: 'var(--text-primary)',
                                        resize: 'vertical',
                                        fontFamily: 'inherit',
                                        fontSize: '0.9rem',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={() => { setIsCreating(false); setNewName(""); setNewValue(""); setNewNotes(""); }}
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
            )}

            {/* Asset Details Modal */}
            {selectedAsset && (
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
                            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{selectedAsset.name}</h2>
                            <button
                                onClick={closeDetails}
                                style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
                            >
                                &times;
                            </button>
                        </div>

                        {/* Update Form */}
                        <form onSubmit={handleUpdate} style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Current Value</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editValue}
                                        onChange={e => setEditValue(e.target.value)}
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
                                        Delete
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
                                            Format: Date,Value,Notes (Date as YYYY-MM-DD)
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
                                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Value</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={newHistValue}
                                                    onChange={e => setNewHistValue(e.target.value)}
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
                                                <AssetHistoryGraph data={history} onPointClick={handlePointClick} />
                                            </div>
                                        )}

                                        {/* Bulk Edit Table */}
                                        {bulkEditMode && (
                                            <div style={{ background: 'var(--bg-panel)', padding: '16px', borderRadius: '8px', marginBottom: '16px', maxHeight: '400px', overflowY: 'auto' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                    <thead>
                                                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                            <th style={{ textAlign: 'left', padding: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Date</th>
                                                            <th style={{ textAlign: 'left', padding: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Value</th>
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
                                                                        value={bulkEdits[h.id]?.value || ''}
                                                                        onChange={e => setBulkEdits(prev => ({ ...prev, [h.id]: { ...prev[h.id], value: e.target.value } }))}
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
                                                                        value={row.value}
                                                                        onChange={e => updateNewBulkRow(index, 'value', e.target.value)}
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
                                                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Value</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={editHistValue}
                                                            onChange={e => setEditHistValue(e.target.value)}
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
