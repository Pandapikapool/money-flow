import { useState, useEffect } from "react";
import {
    fetchLifeXpBuckets, createLifeXpBucket, updateLifeXpBucket, deleteLifeXpBucket,
    addContribution, markBucketAchieved, reactivateBucket, markContributionDone,
    fetchLifeXpHistory, type LifeXpBucket, type LifeXpHistory
} from "../lib/api";
import { formatCurrency } from "../lib/format";
import LifeXpGuide from "../components/LifeXpGuide";

const CONTRIBUTION_FREQUENCIES = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'custom', label: 'Custom (Days)' },
];

const getFrequencyLabel = (freq: string | null, customDays?: number | null) => {
    if (!freq) return '';
    if (freq === 'custom' && customDays) {
        return `Every ${customDays} days`;
    }
    return CONTRIBUTION_FREQUENCIES.find(f => f.value === freq)?.label || freq;
};

const getDaysUntil = (date: string | null): number | null => {
    if (!date) return null;
    const target = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const isContributionDue = (bucket: LifeXpBucket): boolean => {
    if (!bucket.is_repetitive || !bucket.next_contribution_date) return false;
    const days = getDaysUntil(bucket.next_contribution_date);
    return days !== null && days <= 7;
};

const isContributionOverdue = (bucket: LifeXpBucket): boolean => {
    if (!bucket.is_repetitive || !bucket.next_contribution_date) return false;
    const days = getDaysUntil(bucket.next_contribution_date);
    return days !== null && days < 0;
};

// Notify MainLayout of updates for repetitive buckets
const notifyLifeXpUpdated = () => {
    window.dispatchEvent(new Event('lifeXpUpdated'));
};

// Activity Log Entry
interface ActivityLogEntry {
    id: string;
    date: string;
    timestamp: string;
    bucketName: string;
    bucketId: number;
    amount?: number;
    action: 'bucket_created' | 'bucket_updated' | 'bucket_deleted' | 'bucket_achieved' | 'bucket_reactivated' | 'contribution_added' | 'contribution_marked_done' | 'history_updated' | 'history_deleted';
    details?: string;
}

// Get activity log from localStorage
const getLifeXpLog = (): ActivityLogEntry[] => {
    try {
        const saved = localStorage.getItem('lifexp_activity_log');
        if (saved) return JSON.parse(saved);
        return [];
    } catch {
        return [];
    }
};

// Save activity log to localStorage
const saveLifeXpLog = (log: ActivityLogEntry[]) => {
    localStorage.setItem('lifexp_activity_log', JSON.stringify(log));
};

// Add entry to activity log
const addToLifeXpLog = (entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => {
    const log = getLifeXpLog();
    const now = new Date();
    log.unshift({
        ...entry,
        id: Date.now().toString(),
        timestamp: now.toISOString()
    });
    // Keep only last 500 entries
    if (log.length > 500) log.splice(500);
    saveLifeXpLog(log);
};

// Get action label for display
const getLifeXpActionLabel = (action: ActivityLogEntry['action']): string => {
    switch (action) {
        case 'bucket_created': return 'Bucket Created';
        case 'bucket_updated': return 'Bucket Updated';
        case 'bucket_deleted': return 'Bucket Deleted';
        case 'bucket_achieved': return 'Bucket Achieved';
        case 'bucket_reactivated': return 'Bucket Reactivated';
        case 'contribution_added': return 'Contribution Added';
        case 'contribution_marked_done': return 'Contribution Marked Done';
        case 'history_updated': return 'History Updated';
        case 'history_deleted': return 'History Deleted';
        default: return action;
    }
};

// Export log as CSV
const exportLifeXpLogAsCSV = (log: ActivityLogEntry[]) => {
    const headers = ['Date', 'Time', 'Bucket', 'Action', 'Amount', 'Details'];
    const rows = log.map(entry => [
        entry.date,
        entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '',
        entry.bucketName,
        getLifeXpActionLabel(entry.action),
        entry.amount ? entry.amount.toString() : '',
        entry.details || ''
    ]);

    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `lifexp_activity_log_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// Load notes from localStorage
function getLifeXpNotes(): Record<string, string> {
    try {
        const saved = localStorage.getItem('lifexp_notes');
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
}

// Save notes to localStorage
function saveLifeXpNotes(notes: Record<string, string>) {
    localStorage.setItem('lifexp_notes', JSON.stringify(notes));
}

// Reflection prompts for Life XP
const LIFEXP_REFLECTION_PROMPTS = [
    "Am I investing enough in experiences that matter?",
    "Did I achieve the experiences I planned for this year?",
    "What new experiences do I want to prioritize?",
    "Am I balancing saving for future with living today?",
    "Which experience brought me the most joy?",
    "What bucket list items should I add or complete?"
];

export default function LifeXpPage() {
    const [buckets, setBuckets] = useState<LifeXpBucket[]>([]);
    const [loading, setLoading] = useState(true);

    // Create State
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState("");
    const [newTarget, setNewTarget] = useState("");
    const [newIsRepetitive, setNewIsRepetitive] = useState(false);
    const [newFrequency, setNewFrequency] = useState("monthly");
    const [newCustomDays, setNewCustomDays] = useState("");
    const [newNextDate, setNewNextDate] = useState("");
    const [newNotes, setNewNotes] = useState("");

    // Detail Modal State
    const [selectedBucket, setSelectedBucket] = useState<LifeXpBucket | null>(null);
    const [history, setHistory] = useState<LifeXpHistory[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Edit State
    const [editName, setEditName] = useState("");
    const [editTarget, setEditTarget] = useState("");
    const [editIsRepetitive, setEditIsRepetitive] = useState(false);
    const [editFrequency, setEditFrequency] = useState("monthly");
    const [editCustomDays, setEditCustomDays] = useState("");
    const [editNextDate, setEditNextDate] = useState("");
    const [editNotes, setEditNotes] = useState("");
    const [saving, setSaving] = useState(false);

    // Contribution Modal State
    const [showContribute, setShowContribute] = useState(false);
    const [contributeAmount, setContributeAmount] = useState("");
    const [contributeNotes, setContributeNotes] = useState("");

    // Delete State
    const [confirmDelete, setConfirmDelete] = useState(false);

    // View Tab
    const [viewTab, setViewTab] = useState<'active' | 'achieved'>('active');

    // Notes & Reflection state
    const [lifeXpNotes, setLifeXpNotes] = useState<Record<string, string>>(getLifeXpNotes);
    const [notesExpanded, setNotesExpanded] = useState(false);
    const [editingNoteYear, setEditingNoteYear] = useState<string | null>(null);
    const [noteValue, setNoteValue] = useState("");
    const currentYear = new Date().getFullYear().toString();

    // Activity Log State
    const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
    const [showActivityLog, setShowActivityLog] = useState(false);

    // Guide State
    const [showGuide, setShowGuide] = useState(false);

    useEffect(() => {
        loadBuckets();
        setActivityLog(getLifeXpLog());
    }, []);

    const loadBuckets = () => {
        setLoading(true);
        fetchLifeXpBuckets()
            .then(setBuckets)
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newTarget) return;

        try {
            const customDays = newFrequency === 'custom' ? parseInt(newCustomDays) || undefined : undefined;
            const created = await createLifeXpBucket(
                newName,
                parseFloat(newTarget) || 0,
                newIsRepetitive,
                newIsRepetitive ? newFrequency : undefined,
                newIsRepetitive ? newNextDate || undefined : undefined,
                newNotes || undefined,
                customDays
            );
            // Log the creation
            addToLifeXpLog({
                date: new Date().toISOString().split('T')[0],
                bucketName: newName,
                bucketId: created.id,
                amount: parseFloat(newTarget) || 0,
                action: 'bucket_created',
                details: `Target: ${formatCurrency(parseFloat(newTarget) || 0)}${newIsRepetitive ? `, Frequency: ${getFrequencyLabel(newFrequency, customDays)}` : ''}`
            });
            setActivityLog(getLifeXpLog());
            setNewName("");
            setNewTarget("");
            setNewIsRepetitive(false);
            setNewFrequency("monthly");
            setNewCustomDays("");
            setNewNextDate("");
            setNewNotes("");
            setIsCreating(false);
            loadBuckets();
            notifyLifeXpUpdated();
        } catch (err) {
            alert("Failed to create bucket");
        }
    };

    const openBucketDetails = async (bucket: LifeXpBucket) => {
        setSelectedBucket(bucket);
        setEditName(bucket.name);
        setEditTarget(bucket.target_amount.toString());
        setEditIsRepetitive(bucket.is_repetitive);
        setEditFrequency(bucket.contribution_frequency || "monthly");
        setEditCustomDays(bucket.custom_frequency_days?.toString() || "");
        setEditNextDate(bucket.next_contribution_date || "");
        setEditNotes(bucket.notes || "");
        setConfirmDelete(false);
        setShowContribute(false);

        // Load History
        setLoadingHistory(true);
        fetchLifeXpHistory(bucket.id)
            .then(setHistory)
            .catch(console.error)
            .finally(() => setLoadingHistory(false));
    };

    const closeDetails = () => {
        setSelectedBucket(null);
        setHistory([]);
        setShowContribute(false);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBucket || !editName) return;

        setSaving(true);
        try {
            const customDays = editFrequency === 'custom' ? parseInt(editCustomDays) || undefined : undefined;
            const updated = await updateLifeXpBucket(
                selectedBucket.id,
                editName,
                parseFloat(editTarget) || 0,
                editIsRepetitive,
                editIsRepetitive ? editFrequency : undefined,
                editIsRepetitive ? editNextDate || undefined : undefined,
                editNotes,
                customDays
            );
            // Log the update
            const changes: string[] = [];
            if (selectedBucket.name !== updated.name) changes.push(`Name: ${updated.name}`);
            if (selectedBucket.target_amount !== updated.target_amount) changes.push(`Target: ${formatCurrency(updated.target_amount)}`);
            if (selectedBucket.is_repetitive !== updated.is_repetitive) changes.push(`Repetitive: ${updated.is_repetitive}`);
            if (selectedBucket.contribution_frequency !== updated.contribution_frequency) changes.push(`Frequency: ${getFrequencyLabel(updated.contribution_frequency, updated.custom_frequency_days)}`);
            addToLifeXpLog({
                date: new Date().toISOString().split('T')[0],
                bucketName: updated.name,
                bucketId: updated.id,
                amount: updated.target_amount,
                action: 'bucket_updated',
                details: changes.length > 0 ? changes.join(', ') : 'Settings updated'
            });
            setActivityLog(getLifeXpLog());
            setBuckets(prev => prev.map(b => b.id === updated.id ? updated : b));
            setSelectedBucket(updated);
            notifyLifeXpUpdated();
        } catch (err) {
            alert("Failed to update");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedBucket) return;
        try {
            // Log the deletion before it happens
            addToLifeXpLog({
                date: new Date().toISOString().split('T')[0],
                bucketName: selectedBucket.name,
                bucketId: selectedBucket.id,
                amount: selectedBucket.target_amount,
                action: 'bucket_deleted',
                details: `Target: ${formatCurrency(selectedBucket.target_amount)}, Saved: ${formatCurrency(selectedBucket.saved_amount)}`
            });
            setActivityLog(getLifeXpLog());
            await deleteLifeXpBucket(selectedBucket.id);
            setBuckets(prev => prev.filter(b => b.id !== selectedBucket.id));
            closeDetails();
            notifyLifeXpUpdated();
        } catch (err) {
            alert("Failed to delete");
        }
    };

    const handleContribute = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBucket || !contributeAmount) return;

        try {
            const result = await addContribution(
                selectedBucket.id,
                parseFloat(contributeAmount) || 0,
                contributeNotes || undefined
            );
            // Log the contribution
            addToLifeXpLog({
                date: new Date().toISOString().split('T')[0],
                bucketName: selectedBucket.name,
                bucketId: selectedBucket.id,
                amount: parseFloat(contributeAmount) || 0,
                action: 'contribution_added',
                details: `New total: ${formatCurrency(result.bucket.saved_amount)}`
            });
            setActivityLog(getLifeXpLog());
            setBuckets(prev => prev.map(b => b.id === result.bucket.id ? result.bucket : b));
            setSelectedBucket(result.bucket);
            setHistory(prev => [...prev, result.history]);
            setContributeAmount("");
            setContributeNotes("");
            setShowContribute(false);
            notifyLifeXpUpdated();
        } catch (err) {
            alert("Failed to add contribution");
        }
    };

    const handleMarkDone = async (bucket: LifeXpBucket, amount?: number) => {
        const contributionAmount = amount ?? (bucket.target_amount / 12); // Default to monthly target
        try {
            const result = await markContributionDone(bucket.id, contributionAmount);
            // Log the contribution
            addToLifeXpLog({
                date: new Date().toISOString().split('T')[0],
                bucketName: bucket.name,
                bucketId: bucket.id,
                amount: contributionAmount,
                action: 'contribution_marked_done',
                details: `New total: ${formatCurrency(result.bucket.saved_amount)}`
            });
            setActivityLog(getLifeXpLog());
            setBuckets(prev => prev.map(b => b.id === result.bucket.id ? result.bucket : b));
            if (selectedBucket && selectedBucket.id === result.bucket.id) {
                setSelectedBucket(result.bucket);
                setEditNextDate(result.bucket.next_contribution_date || "");
                setHistory(prev => [...prev, result.history]);
            }
            notifyLifeXpUpdated();
        } catch (err) {
            alert("Failed to mark as done");
        }
    };

    const handleAchieved = async (bucket: LifeXpBucket) => {
        try {
            const updated = await markBucketAchieved(bucket.id);
            // Log the achievement
            addToLifeXpLog({
                date: new Date().toISOString().split('T')[0],
                bucketName: bucket.name,
                bucketId: bucket.id,
                amount: bucket.saved_amount,
                action: 'bucket_achieved',
                details: `Target: ${formatCurrency(bucket.target_amount)}, Saved: ${formatCurrency(bucket.saved_amount)}`
            });
            setActivityLog(getLifeXpLog());
            setBuckets(prev => prev.map(b => b.id === updated.id ? updated : b));
            if (selectedBucket && selectedBucket.id === updated.id) {
                setSelectedBucket(updated);
            }
            notifyLifeXpUpdated();
        } catch (err) {
            alert("Failed to mark as achieved");
        }
    };

    const handleReactivate = async (bucket: LifeXpBucket) => {
        try {
            const updated = await reactivateBucket(bucket.id);
            // Log the reactivation
            addToLifeXpLog({
                date: new Date().toISOString().split('T')[0],
                bucketName: bucket.name,
                bucketId: bucket.id,
                amount: bucket.saved_amount,
                action: 'bucket_reactivated',
                details: `Target: ${formatCurrency(bucket.target_amount)}`
            });
            setActivityLog(getLifeXpLog());
            setBuckets(prev => prev.map(b => b.id === updated.id ? updated : b));
            if (selectedBucket && selectedBucket.id === updated.id) {
                setSelectedBucket(updated);
            }
            notifyLifeXpUpdated();
        } catch (err) {
            alert("Failed to reactivate");
        }
    };

    // Delete activity log entry
    const handleDeleteLogEntry = (id: string) => {
        const log = getLifeXpLog().filter(entry => entry.id !== id);
        saveLifeXpLog(log);
        setActivityLog(log);
    };

    // Calculate totals
    const activeBuckets = buckets.filter(b => b.status === 'active');
    const achievedBuckets = buckets.filter(b => b.status === 'achieved');
    const totalTarget = activeBuckets.reduce((sum, b) => sum + b.target_amount, 0);
    const totalSaved = activeBuckets.reduce((sum, b) => sum + b.saved_amount, 0);
    const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

    // Action needed count for repetitive buckets
    const actionNeededBuckets = activeBuckets.filter(b => b.is_repetitive && (isContributionDue(b) || isContributionOverdue(b)));

    const displayBuckets = viewTab === 'active' ? activeBuckets : achievedBuckets;

    // Notes/Reflection functions
    const startEditNote = (year: string) => {
        setEditingNoteYear(year);
        setNoteValue(lifeXpNotes[year] || '');
    };

    const saveNote = () => {
        if (!editingNoteYear) return;
        const newNotes = { ...lifeXpNotes };
        if (noteValue.trim()) {
            newNotes[editingNoteYear] = noteValue.trim();
        } else {
            delete newNotes[editingNoteYear];
        }
        setLifeXpNotes(newNotes);
        saveLifeXpNotes(newNotes);
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
            {/* Alert Bar for Due Contributions */}
            {actionNeededBuckets.length > 0 && (
                <div style={{
                    marginBottom: '24px',
                    padding: '14px 20px',
                    borderRadius: '8px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid var(--accent-primary)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <span style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: 'var(--accent-primary)',
                            animation: 'pulse 1.5s infinite'
                        }} />
                        <div style={{ flex: 1, color: 'var(--accent-primary)', fontWeight: '500' }}>
                            Contributions due: {actionNeededBuckets.map(b => {
                                const days = getDaysUntil(b.next_contribution_date);
                                return `${b.name} (${days !== null && days < 0 ? `${Math.abs(days)}d ago` : `${days}d`})`;
                            }).join(', ')}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: '600', margin: 0 }}>Life XP</h1>
                    {actionNeededBuckets.length > 0 && (
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '22px',
                            height: '22px',
                            borderRadius: '11px',
                            background: 'var(--accent-primary)',
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            padding: '0 6px'
                        }}>
                            {actionNeededBuckets.length}
                        </span>
                    )}
                    <button
                        onClick={() => setShowGuide(true)}
                        style={{
                            padding: '6px 12px',
                            background: 'var(--bg-panel)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '500',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--accent-primary)';
                            e.currentTarget.style.color = 'white';
                            e.currentTarget.style.borderColor = 'var(--accent-primary)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--bg-panel)';
                            e.currentTarget.style.color = 'var(--text-primary)';
                            e.currentTarget.style.borderColor = 'var(--border-color)';
                        }}
                        title="View Life XP Guide"
                    >
                        <span>📖</span>
                        <span>Guide</span>
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '32px' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Saved</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--accent-success)' }}>
                            {formatCurrency(totalSaved)}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overall Progress</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--accent-primary)' }}>
                            {overallProgress.toFixed(0)}%
                        </div>
                    </div>
                </div>
            </div>

            {/* View Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                <button
                    onClick={() => setViewTab('active')}
                    style={{
                        padding: '8px 16px',
                        background: viewTab === 'active' ? 'var(--accent-primary)' : 'var(--bg-panel)',
                        color: viewTab === 'active' ? '#fff' : 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '500'
                    }}
                >
                    Active ({activeBuckets.length})
                </button>
                <button
                    onClick={() => setViewTab('achieved')}
                    style={{
                        padding: '8px 16px',
                        background: viewTab === 'achieved' ? 'var(--accent-success)' : 'var(--bg-panel)',
                        color: viewTab === 'achieved' ? '#fff' : 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '500'
                    }}
                >
                    Achieved ({achievedBuckets.length})
                </button>
            </div>

            {/* Buckets Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {displayBuckets.map(bucket => {
                    const progress = bucket.target_amount > 0 ? (bucket.saved_amount / bucket.target_amount) * 100 : 0;
                    const isAchieved = bucket.status === 'achieved';
                    const isDue = isContributionDue(bucket);
                    const isOverdue = isContributionOverdue(bucket);
                    const contributionDays = getDaysUntil(bucket.next_contribution_date);

                    return (
                        <div
                            key={bucket.id}
                            className="glass-panel"
                            style={{
                                padding: '20px',
                                cursor: 'pointer',
                                transition: 'transform 0.15s, box-shadow 0.15s',
                                borderLeft: isAchieved ? '4px solid var(--accent-success)' : isDue || isOverdue ? '4px solid var(--accent-primary)' : '4px solid transparent',
                                position: 'relative',
                                opacity: isAchieved ? 0.8 : 1,
                            }}
                            onClick={() => openBucketDetails(bucket)}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            {/* Notification Dot for repetitive buckets */}
                            {!isAchieved && bucket.is_repetitive && (isDue || isOverdue) && (
                                <span style={{
                                    position: 'absolute',
                                    top: '12px',
                                    right: '12px',
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    background: isOverdue ? 'var(--accent-danger)' : 'var(--accent-primary)',
                                    boxShadow: `0 0 0 3px ${isOverdue ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)'}`,
                                }} title={isOverdue ? 'Contribution overdue!' : 'Contribution due soon'} />
                            )}

                            {/* Achieved Badge */}
                            {isAchieved && (
                                <span style={{
                                    position: 'absolute',
                                    top: '12px',
                                    right: '12px',
                                    fontSize: '0.7rem',
                                    padding: '3px 8px',
                                    borderRadius: '12px',
                                    background: 'var(--accent-success)',
                                    color: 'white',
                                    fontWeight: '500',
                                }}>
                                    ACHIEVED
                                </span>
                            )}

                            <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px', paddingRight: '70px' }}>
                                {bucket.name}
                            </div>

                            {/* Progress Bar */}
                            <div style={{ marginBottom: '12px' }}>
                                <div style={{
                                    height: '8px',
                                    background: 'var(--border-color)',
                                    borderRadius: '4px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${Math.min(progress, 100)}%`,
                                        background: progress >= 100 ? 'var(--accent-success)' : 'var(--accent-primary)',
                                        borderRadius: '4px',
                                        transition: 'width 0.3s'
                                    }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.8rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>
                                        {formatCurrency(bucket.saved_amount)} / {formatCurrency(bucket.target_amount)}
                                    </span>
                                    <span style={{ fontWeight: '600', color: progress >= 100 ? 'var(--accent-success)' : 'var(--accent-primary)' }}>
                                        {progress.toFixed(0)}%
                                    </span>
                                </div>
                            </div>

                            {/* Repetitive Info */}
                            {bucket.is_repetitive && bucket.next_contribution_date && !isAchieved && (
                                <div style={{
                                    fontSize: '0.8rem',
                                    color: isOverdue ? 'var(--accent-danger)' : isDue ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                    fontWeight: isOverdue || isDue ? '600' : '400',
                                    marginBottom: '4px'
                                }}>
                                    {isOverdue
                                        ? `Contribution overdue by ${Math.abs(contributionDays || 0)} days`
                                        : isDue
                                            ? `Due in ${contributionDays} days`
                                            : `Next: ${new Date(bucket.next_contribution_date).toLocaleDateString()}`
                                    }
                                    <span style={{ marginLeft: '8px', color: 'var(--text-secondary)', fontWeight: '400' }}>
                                        ({getFrequencyLabel(bucket.contribution_frequency, bucket.custom_frequency_days)})
                                    </span>
                                </div>
                            )}

                            {bucket.notes && (
                                <div style={{
                                    marginTop: '8px',
                                    fontSize: '0.8rem',
                                    color: 'var(--text-secondary)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    {bucket.notes.split('\n')[0]}
                                </div>
                            )}

                            {/* Quick Actions */}
                            {!isAchieved && (
                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openBucketDetails(bucket); setShowContribute(true); }}
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            background: 'var(--accent-primary)',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            fontWeight: '500'
                                        }}
                                    >
                                        + Add
                                    </button>
                                    {bucket.is_repetitive && (isDue || isOverdue) && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleMarkDone(bucket); }}
                                            style={{
                                                padding: '8px 12px',
                                                background: 'var(--accent-success)',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem',
                                                fontWeight: '500'
                                            }}
                                        >
                                            Mark Done
                                        </button>
                                    )}
                                    {progress >= 100 && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleAchieved(bucket); }}
                                            style={{
                                                padding: '8px 12px',
                                                background: 'var(--accent-success)',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem',
                                                fontWeight: '500'
                                            }}
                                        >
                                            Achieved!
                                        </button>
                                    )}
                                </div>
                            )}

                            {isAchieved && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleReactivate(bucket); }}
                                    style={{
                                        marginTop: '12px',
                                        width: '100%',
                                        padding: '8px 12px',
                                        background: 'transparent',
                                        color: 'var(--text-secondary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    Reactivate
                                </button>
                            )}
                        </div>
                    );
                })}

                {/* Add Bucket Tile */}
                {viewTab === 'active' && (
                    !isCreating ? (
                        <div
                            className="glass-panel"
                            onClick={() => setIsCreating(true)}
                            style={{
                                minHeight: '180px',
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
                                <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '12px' }}>New Goal</div>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="Goal Name (e.g., Europe Trip)"
                                    style={{ marginBottom: '8px' }}
                                    autoFocus
                                />
                                <input
                                    type="number"
                                    value={newTarget}
                                    onChange={e => setNewTarget(e.target.value)}
                                    placeholder="Target Amount"
                                    style={{ marginBottom: '8px' }}
                                />
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={newIsRepetitive}
                                        onChange={e => setNewIsRepetitive(e.target.checked)}
                                    />
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        Recurring contributions (with reminders)
                                    </span>
                                </label>
                                {newIsRepetitive && (
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: newFrequency === 'custom' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                            <select
                                                value={newFrequency}
                                                onChange={e => setNewFrequency(e.target.value)}
                                                style={{
                                                    padding: '10px',
                                                    background: 'var(--input-bg)',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '8px',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '0.9rem',
                                                }}
                                            >
                                                {CONTRIBUTION_FREQUENCIES.map(f => (
                                                    <option key={f.value} value={f.value}>{f.label}</option>
                                                ))}
                                            </select>
                                            {newFrequency === 'custom' && (
                                                <input
                                                    type="number"
                                                    value={newCustomDays}
                                                    onChange={e => setNewCustomDays(e.target.value)}
                                                    placeholder="Days"
                                                    min="1"
                                                />
                                            )}
                                            <input
                                                type="date"
                                                value={newNextDate}
                                                onChange={e => setNewNextDate(e.target.value)}
                                                title="Next Contribution Date"
                                            />
                                        </div>
                                    </>
                                )}
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
                                        onClick={() => { setIsCreating(false); setNewName(""); setNewTarget(""); setNewIsRepetitive(false); setNewNotes(""); }}
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
                    )
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
                                {LIFEXP_REFLECTION_PROMPTS.map((prompt, idx) => (
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
                                                {lifeXpNotes[year] ? 'Edit' : 'Add Notes'}
                                            </button>
                                        )}
                                    </div>

                                    {editingNoteYear === year ? (
                                        <div>
                                            <textarea
                                                value={noteValue}
                                                onChange={e => setNoteValue(e.target.value)}
                                                onKeyDown={handleNoteKeyDown}
                                                placeholder="Write your Life XP reflections for this year..."
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
                                            color: lifeXpNotes[year] ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            lineHeight: '1.6',
                                            whiteSpace: 'pre-wrap',
                                            minHeight: '60px'
                                        }}>
                                            {lifeXpNotes[year] || 'No notes yet. Click "Add Notes" to write your reflections.'}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Activity Log Section */}
            <div style={{ marginTop: '40px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Activity Log</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {showActivityLog && activityLog.length > 0 && (
                            <button
                                onClick={() => exportLifeXpLogAsCSV(activityLog)}
                                style={{
                                    padding: '6px 12px',
                                    background: 'var(--accent-success)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    color: 'white',
                                    fontWeight: '500'
                                }}
                            >
                                Export CSV
                            </button>
                        )}
                        <button
                            onClick={() => setShowActivityLog(!showActivityLog)}
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
                            {showActivityLog ? 'Hide' : 'Show'} ({activityLog.length} entries)
                        </button>
                    </div>
                </div>
                {showActivityLog && (
                    <div className="glass-panel" style={{ padding: '16px', maxHeight: '400px', overflowY: 'auto' }}>
                        {activityLog.length === 0 ? (
                            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                                No activity records yet. Records will appear here when you perform actions on buckets.
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ textAlign: 'left', padding: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Date</th>
                                        <th style={{ textAlign: 'left', padding: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Bucket</th>
                                        <th style={{ textAlign: 'left', padding: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Action</th>
                                        <th style={{ textAlign: 'right', padding: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Amount</th>
                                        <th style={{ textAlign: 'left', padding: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Details</th>
                                        <th style={{ width: '60px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activityLog.map(entry => {
                                        const actionColor =
                                            entry.action === 'contribution_added' || entry.action === 'contribution_marked_done' ? 'var(--accent-success)' :
                                            entry.action === 'bucket_created' ? 'var(--accent-primary)' :
                                            entry.action === 'bucket_updated' ? 'var(--accent-warning)' :
                                            entry.action === 'bucket_deleted' || entry.action === 'history_deleted' ? 'var(--accent-danger)' :
                                            entry.action === 'bucket_achieved' ? 'var(--accent-success)' :
                                            'var(--text-secondary)';

                                        return (
                                            <tr key={entry.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '8px', fontSize: '0.85rem' }}>
                                                    {new Date(entry.date).toLocaleDateString()}
                                                </td>
                                                <td style={{ padding: '8px', fontSize: '0.85rem', fontWeight: '500' }}>
                                                    {entry.bucketName}
                                                </td>
                                                <td style={{ padding: '8px' }}>
                                                    <span style={{
                                                        fontSize: '0.7rem',
                                                        padding: '2px 8px',
                                                        borderRadius: '10px',
                                                        background: actionColor,
                                                        color: 'white'
                                                    }}>
                                                        {getLifeXpActionLabel(entry.action)}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.85rem', fontWeight: '500', color: 'var(--accent-warning)' }}>
                                                    {entry.amount && entry.amount > 0 ? formatCurrency(entry.amount) : '-'}
                                                </td>
                                                <td style={{ padding: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.details || ''}>
                                                    {entry.details || '-'}
                                                </td>
                                                <td style={{ padding: '8px' }}>
                                                    <button
                                                        onClick={() => handleDeleteLogEntry(entry.id)}
                                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-danger)', fontSize: '0.75rem' }}
                                                        title="Delete entry"
                                                    >
                                                        Del
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>

            {/* Bucket Details Modal */}
            {selectedBucket && (
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
                            width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto',
                            backgroundColor: 'var(--bg-app)', padding: '28px', borderRadius: '12px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{selectedBucket.name}</h2>
                            <button
                                onClick={closeDetails}
                                style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
                            >
                                &times;
                            </button>
                        </div>

                        {/* Progress Display */}
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{
                                height: '12px',
                                background: 'var(--border-color)',
                                borderRadius: '6px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${Math.min((selectedBucket.saved_amount / selectedBucket.target_amount) * 100, 100)}%`,
                                    background: selectedBucket.saved_amount >= selectedBucket.target_amount ? 'var(--accent-success)' : 'var(--accent-primary)',
                                    borderRadius: '6px',
                                    transition: 'width 0.3s'
                                }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                                <span style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--accent-success)' }}>
                                    {formatCurrency(selectedBucket.saved_amount)}
                                </span>
                                <span style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                                    of {formatCurrency(selectedBucket.target_amount)}
                                </span>
                                <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--accent-primary)' }}>
                                    {((selectedBucket.saved_amount / selectedBucket.target_amount) * 100).toFixed(0)}%
                                </span>
                            </div>
                        </div>

                        {/* Contribution Form */}
                        {showContribute && selectedBucket.status === 'active' && (
                            <form onSubmit={handleContribute} style={{
                                marginBottom: '24px',
                                padding: '16px',
                                border: '1px dashed var(--accent-primary)',
                                borderRadius: '8px',
                                background: 'rgba(99, 102, 241, 0.05)'
                            }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '12px' }}>Add Contribution</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                                    <input
                                        type="number"
                                        value={contributeAmount}
                                        onChange={e => setContributeAmount(e.target.value)}
                                        placeholder="Amount"
                                        autoFocus
                                    />
                                    <input
                                        type="text"
                                        value={contributeNotes}
                                        onChange={e => setContributeNotes(e.target.value)}
                                        placeholder="Notes (optional)"
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowContribute(false)}
                                        style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)' }}
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
                            </form>
                        )}

                        {!showContribute && selectedBucket.status === 'active' && (
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                                <button
                                    onClick={() => setShowContribute(true)}
                                    style={{
                                        padding: '10px 20px',
                                        background: 'var(--accent-primary)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: '500'
                                    }}
                                >
                                    + Add Contribution
                                </button>
                                {selectedBucket.saved_amount >= selectedBucket.target_amount && (
                                    <button
                                        onClick={() => handleAchieved(selectedBucket)}
                                        style={{
                                            padding: '10px 20px',
                                            background: 'var(--accent-success)',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: '500'
                                        }}
                                    >
                                        Mark as Achieved
                                    </button>
                                )}
                            </div>
                        )}

                        <hr style={{ borderColor: 'var(--border-color)', margin: '24px 0', opacity: 0.3 }} />

                        {/* Settings Form */}
                        <form onSubmit={handleUpdate}>
                            <h3 style={{ fontSize: '1rem', margin: '0 0 16px 0' }}>Settings</h3>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Name</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    style={{ width: '100%', fontSize: '1.1rem', fontWeight: '600' }}
                                    required
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Target Amount</label>
                                    <input
                                        type="number"
                                        value={editTarget}
                                        onChange={e => setEditTarget(e.target.value)}
                                        style={{ fontSize: '1.1rem', fontWeight: '600' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '28px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={editIsRepetitive}
                                            onChange={e => setEditIsRepetitive(e.target.checked)}
                                        />
                                        <span style={{ fontSize: '0.85rem' }}>Recurring (with reminders)</span>
                                    </label>
                                </div>
                            </div>
                            {editIsRepetitive && (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Frequency</label>
                                            <select
                                                value={editFrequency}
                                                onChange={e => setEditFrequency(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    background: 'var(--input-bg)',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '8px',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '0.95rem',
                                                }}
                                            >
                                                {CONTRIBUTION_FREQUENCIES.map(f => (
                                                    <option key={f.value} value={f.value}>{f.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Next Contribution Date</label>
                                            <input
                                                type="date"
                                                value={editNextDate}
                                                onChange={e => setEditNextDate(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    {editFrequency === 'custom' && (
                                        <div style={{ marginBottom: '16px' }}>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Custom Frequency (Days)</label>
                                            <input
                                                type="number"
                                                value={editCustomDays}
                                                onChange={e => setEditCustomDays(e.target.value)}
                                                placeholder="Number of days"
                                                min="1"
                                                style={{ width: '200px' }}
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Notes</label>
                                <textarea
                                    value={editNotes}
                                    onChange={e => setEditNotes(e.target.value)}
                                    placeholder="Goal details..."
                                    rows={2}
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
                                        boxSizing: 'border-box'
                                    }}
                                />
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

                        {/* History */}
                        <h3 style={{ fontSize: '1rem', margin: '0 0 16px 0' }}>Contribution History</h3>
                        {loadingHistory ? (
                            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>Loading...</div>
                        ) : history.length === 0 ? (
                            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>No contributions yet</div>
                        ) : (
                            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <th style={{ textAlign: 'left', padding: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Date</th>
                                            <th style={{ textAlign: 'right', padding: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Amount</th>
                                            <th style={{ textAlign: 'right', padding: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total</th>
                                            <th style={{ textAlign: 'left', padding: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map(h => (
                                            <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '8px', fontSize: '0.85rem' }}>{new Date(h.date).toLocaleDateString()}</td>
                                                <td style={{ padding: '8px', fontSize: '0.85rem', textAlign: 'right', fontWeight: '500', color: h.amount >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                                                    {h.amount >= 0 ? '+' : ''}{formatCurrency(h.amount)}
                                                </td>
                                                <td style={{ padding: '8px', fontSize: '0.85rem', textAlign: 'right' }}>{formatCurrency(h.total_saved)}</td>
                                                <td style={{ padding: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{h.notes || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CSS Animation for pulse */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>

            {/* Life XP Guide Sidebar */}
            <LifeXpGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
        </div>
    );
}
