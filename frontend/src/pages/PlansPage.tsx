import { useState, useEffect, useRef } from "react";
import { fetchPlans, createPlan, updatePlan, deletePlan, fetchPlanHistory, createPlanHistoryEntry, updatePlanHistoryEntry, deletePlanHistoryEntry, type Plan, type PlanHistory } from "../lib/api";
import { formatCurrency } from "../lib/format";
import PlanHistoryGraph from "../components/PlanHistoryGraph";

const PREMIUM_FREQUENCIES = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'half_yearly', label: 'Half Yearly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'custom', label: 'Custom (Days)' },
];

const getFrequencyLabel = (freq: string, customDays?: number | null) => {
    if (freq === 'custom' && customDays) {
        return `Every ${customDays} days`;
    }
    return PREMIUM_FREQUENCIES.find(f => f.value === freq)?.label || freq;
};

const getAnnualPremium = (amount: number, frequency: string, customDays?: number | null): number => {
    switch (frequency) {
        case 'monthly': return amount * 12;
        case 'quarterly': return amount * 4;
        case 'half_yearly': return amount * 2;
        case 'yearly': return amount;
        case 'custom':
            if (customDays && customDays > 0) {
                return amount * (365 / customDays);
            }
            return amount;
        default: return amount;
    }
};


const getDaysUntil = (date: string | null): number | null => {
    if (!date) return null;
    const target = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const isExpiringSoon = (expiryDate: string | null, daysThreshold: number = 60): boolean => {
    const days = getDaysUntil(expiryDate);
    return days !== null && days >= 0 && days <= daysThreshold;
};

const isExpired = (expiryDate: string | null): boolean => {
    const days = getDaysUntil(expiryDate);
    return days !== null && days < 0;
};

// Premium due only applies for NON-expired plans
const isPremiumDue = (nextPremiumDate: string | null, daysThreshold: number = 15, expiryDate?: string | null): boolean => {
    if (expiryDate && isExpired(expiryDate)) return false;
    const days = getDaysUntil(nextPremiumDate);
    return days !== null && days >= 0 && days <= daysThreshold;
};

const isPremiumOverdue = (nextPremiumDate: string | null, expiryDate?: string | null): boolean => {
    if (expiryDate && isExpired(expiryDate)) return false;
    const days = getDaysUntil(nextPremiumDate);
    return days !== null && days < 0;
};

// Notify MainLayout of plan changes
const notifyPlansUpdated = () => {
    window.dispatchEvent(new Event('plansUpdated'));
};

// Activity Log Entry - comprehensive logging
interface ActivityLogEntry {
    id: string;
    date: string;
    timestamp: string;
    planName: string;
    planId: number;
    amount?: number;
    action: 'premium_paid' | 'plan_created' | 'plan_updated' | 'plan_deleted' | 'plan_expired_ack' | 'history_added' | 'history_updated' | 'history_deleted';
    details?: string;
}

// Backward compatibility alias
type PaymentLogEntry = ActivityLogEntry;

// Get activity log from localStorage
const getPaymentLog = (): ActivityLogEntry[] => {
    try {
        const saved = localStorage.getItem('planActivityLog');
        if (saved) return JSON.parse(saved);
        // Migrate old payment log if exists
        const oldLog = localStorage.getItem('planPaymentLog');
        if (oldLog) {
            const parsed = JSON.parse(oldLog);
            localStorage.setItem('planActivityLog', oldLog);
            return parsed;
        }
        return [];
    } catch {
        return [];
    }
};

// Save activity log to localStorage
const savePaymentLog = (log: ActivityLogEntry[]) => {
    localStorage.setItem('planActivityLog', JSON.stringify(log));
};

// Add entry to activity log
const addToPaymentLog = (entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => {
    const log = getPaymentLog();
    const now = new Date();
    log.unshift({
        ...entry,
        id: Date.now().toString(),
        timestamp: now.toISOString()
    });
    // Keep only last 500 entries
    if (log.length > 500) log.splice(500);
    savePaymentLog(log);
};

// Get action label for display
const getActionLabel = (action: ActivityLogEntry['action']): string => {
    switch (action) {
        case 'premium_paid': return 'Premium Paid';
        case 'plan_created': return 'Plan Created';
        case 'plan_updated': return 'Plan Updated';
        case 'plan_deleted': return 'Plan Deleted';
        case 'plan_expired_ack': return 'Expired Acknowledged';
        case 'history_added': return 'History Added';
        case 'history_updated': return 'History Updated';
        case 'history_deleted': return 'History Deleted';
        default: return action;
    }
};

// Export log as CSV
const exportLogAsCSV = (log: ActivityLogEntry[]) => {
    const headers = ['Date', 'Time', 'Plan', 'Action', 'Amount', 'Details'];
    const rows = log.map(entry => [
        entry.date,
        entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '',
        entry.planName,
        getActionLabel(entry.action),
        entry.amount ? entry.amount.toString() : '',
        entry.details || ''
    ]);

    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `plans_activity_log_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// Get acknowledged expired plans from localStorage
const getAcknowledgedExpired = (): number[] => {
    try {
        const saved = localStorage.getItem('acknowledgedExpiredPlans');
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
};

// Save acknowledged expired plans
const saveAcknowledgedExpired = (ids: number[]) => {
    localStorage.setItem('acknowledgedExpiredPlans', JSON.stringify(ids));
};

// Load notes from localStorage
function getInsuranceNotes(): Record<string, string> {
    try {
        const saved = localStorage.getItem('insurance_notes');
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
}

// Save notes to localStorage
function saveInsuranceNotes(notes: Record<string, string>) {
    localStorage.setItem('insurance_notes', JSON.stringify(notes));
}

// Reflection prompts for Insurance
const INSURANCE_REFLECTION_PROMPTS = [
    "Is my life insurance coverage adequate for my family's needs?",
    "Am I paying premiums on time to avoid policy lapse?",
    "Should I review and upgrade my health insurance?",
    "Are there any gaps in my insurance coverage?",
    "Do I have term insurance for pure protection?",
    "Should I consider adding riders to existing policies?"
];

export default function PlansPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);

    // Create State
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState("");
    const [newCover, setNewCover] = useState("");
    const [newPremium, setNewPremium] = useState("");
    const [newFrequency, setNewFrequency] = useState("yearly");
    const [newCustomDays, setNewCustomDays] = useState("");
    const [newExpiry, setNewExpiry] = useState("");
    const [newNextPremium, setNewNextPremium] = useState("");
    const [newNotes, setNewNotes] = useState("");

    // Detail/Edit Modal State
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [history, setHistory] = useState<PlanHistory[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [showGraph, setShowGraph] = useState(false);
    const [planPremiumTotals, setPlanPremiumTotals] = useState<Record<number, number>>({});

    // Edit Current State
    const [editName, setEditName] = useState("");
    const [editCover, setEditCover] = useState("");
    const [editPremium, setEditPremium] = useState("");
    const [editFrequency, setEditFrequency] = useState("yearly");
    const [editCustomDays, setEditCustomDays] = useState("");
    const [editExpiry, setEditExpiry] = useState("");
    const [editNextPremium, setEditNextPremium] = useState("");
    const [editNotes, setEditNotes] = useState("");
    const [saving, setSaving] = useState(false);

    // Delete State
    const [confirmDelete, setConfirmDelete] = useState(false);

    // Edit History Entry State
    const [editHistoryEntry, setEditHistoryEntry] = useState<PlanHistory | null>(null);
    const [editHistDate, setEditHistDate] = useState("");
    const [editHistCover, setEditHistCover] = useState("");
    const [editHistPremium, setEditHistPremium] = useState("");
    const [editHistNotes, setEditHistNotes] = useState("");

    // Bulk Edit State
    const [bulkEditMode, setBulkEditMode] = useState(false);
    const [bulkEdits, setBulkEdits] = useState<{ [id: number]: { date: string; cover_amount: string; premium_amount: string; notes: string } }>({});

    // CSV Import State
    const [showImport, setShowImport] = useState(false);
    const [csvText, setCsvText] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Manual History Add State
    const [showAddHistory, setShowAddHistory] = useState(false);
    const [newHistDate, setNewHistDate] = useState("");
    const [newHistCover, setNewHistCover] = useState("");
    const [newHistPremium, setNewHistPremium] = useState("");
    const [newHistNotes, setNewHistNotes] = useState("");

    // Mark Paid Confirmation Modal State
    const [markPaidPlan, setMarkPaidPlan] = useState<Plan | null>(null);
    const [markPaidNextDate, setMarkPaidNextDate] = useState("");

    // Acknowledged Expired Plans
    const [acknowledgedExpired, setAcknowledgedExpired] = useState<number[]>([]);

    // Activity Log State
    const [paymentLog, setPaymentLog] = useState<PaymentLogEntry[]>([]);
    const [showPaymentLog, setShowPaymentLog] = useState(false);

    // View Tab State
    const [viewTab, setViewTab] = useState<'all' | 'yearly'>('all');
    const currentYear = new Date().getFullYear();

    // Expired Plans Collapsed State
    const [expiredCollapsed, setExpiredCollapsed] = useState(true);

    // Notes & Reflection state
    const [insuranceNotes, setInsuranceNotes] = useState<Record<string, string>>(getInsuranceNotes);
    const [notesExpanded, setNotesExpanded] = useState(false);
    const [editingNoteYear, setEditingNoteYear] = useState<string | null>(null);
    const [noteValue, setNoteValue] = useState("");
    const currentYearStr = currentYear.toString();

    useEffect(() => {
        loadPlans();
        setAcknowledgedExpired(getAcknowledgedExpired());
        setPaymentLog(getPaymentLog());
    }, []);

    const updatePremiumTotal = (planId: number, historyData: PlanHistory[]) => {
        const total = historyData.reduce((sum, entry) => sum + entry.premium_amount, 0);
        setPlanPremiumTotals(prev => ({ ...prev, [planId]: total }));
    };

    const loadPlans = async () => {
        setLoading(true);
        try {
            const plansData = await fetchPlans();
            setPlans(plansData);
            
            // Load history for all plans to calculate total premium paid
            const totals: Record<number, number> = {};
            await Promise.all(plansData.map(async (plan) => {
                try {
                    const planHistory = await fetchPlanHistory(plan.id);
                    const total = planHistory.reduce((sum, entry) => sum + entry.premium_amount, 0);
                    totals[plan.id] = total;
                } catch (err) {
                    totals[plan.id] = 0;
                }
            }));
            setPlanPremiumTotals(totals);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName) return;

        try {
            const customDays = newFrequency === 'custom' ? parseInt(newCustomDays) || undefined : undefined;
            const created = await createPlan(
                newName,
                parseFloat(newCover) || 0,
                parseFloat(newPremium) || 0,
                newFrequency,
                newExpiry || undefined,
                newNextPremium || undefined,
                newNotes || undefined,
                customDays
            );
            // Log the creation
            addToPaymentLog({
                date: new Date().toISOString().split('T')[0],
                planName: newName,
                planId: created.id,
                amount: parseFloat(newCover) || 0,
                action: 'plan_created',
                details: `Cover: ${formatCurrency(parseFloat(newCover) || 0)}, Premium: ${formatCurrency(parseFloat(newPremium) || 0)}/${getFrequencyLabel(newFrequency, customDays)}`
            });
            setPaymentLog(getPaymentLog());
            setNewName("");
            setNewCover("");
            setNewPremium("");
            setNewFrequency("yearly");
            setNewCustomDays("");
            setNewExpiry("");
            setNewNextPremium("");
            setNewNotes("");
            setIsCreating(false);
            loadPlans();
            notifyPlansUpdated();
        } catch (err) {
            alert("Failed to create plan");
        }
    };

    const openPlanDetails = async (plan: Plan) => {
        setSelectedPlan(plan);
        setEditName(plan.name);
        setEditCover(plan.cover_amount.toString());
        setEditPremium(plan.premium_amount.toString());
        setEditFrequency(plan.premium_frequency);
        setEditCustomDays(plan.custom_frequency_days?.toString() || "");
        setEditExpiry(plan.expiry_date || "");
        setEditNextPremium(plan.next_premium_date || "");
        setEditNotes(plan.notes || "");
        setShowGraph(false);
        setConfirmDelete(false);
        setBulkEditMode(false);
        setBulkEdits({});
        setShowImport(false);

        // Load History
        setLoadingHistory(true);
        fetchPlanHistory(plan.id)
            .then(hist => {
                setHistory(hist);
                updatePremiumTotal(plan.id, hist);
            })
            .catch(console.error)
            .finally(() => setLoadingHistory(false));
    };

    const closeDetails = () => {
        setSelectedPlan(null);
        setHistory([]);
        setEditHistoryEntry(null);
        setShowGraph(false);
        setBulkEditMode(false);
        setBulkEdits({});
        setShowImport(false);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPlan || !editName) return;

        setSaving(true);
        try {
            const customDays = editFrequency === 'custom' ? parseInt(editCustomDays) || undefined : undefined;
            const updated = await updatePlan(
                selectedPlan.id,
                editName,
                parseFloat(editCover) || 0,
                parseFloat(editPremium) || 0,
                editFrequency,
                editExpiry || undefined,
                editNextPremium || undefined,
                editNotes,
                customDays
            );
            setPlans(prev => prev.map(p => p.id === updated.id ? updated : p));
            setSelectedPlan(updated);
            // Log the update
            const changes: string[] = [];
            if (selectedPlan.name !== updated.name) changes.push(`Name: ${updated.name}`);
            if (selectedPlan.cover_amount !== updated.cover_amount) changes.push(`Cover: ${formatCurrency(updated.cover_amount)}`);
            if (selectedPlan.premium_amount !== updated.premium_amount) changes.push(`Premium: ${formatCurrency(updated.premium_amount)}`);
            if (selectedPlan.premium_frequency !== updated.premium_frequency) changes.push(`Freq: ${getFrequencyLabel(updated.premium_frequency, updated.custom_frequency_days)}`);
            if (selectedPlan.expiry_date !== updated.expiry_date) changes.push(`Expiry: ${updated.expiry_date || 'None'}`);
            if (selectedPlan.next_premium_date !== updated.next_premium_date) changes.push(`Next: ${updated.next_premium_date || 'None'}`);
            addToPaymentLog({
                date: new Date().toISOString().split('T')[0],
                planName: updated.name,
                planId: updated.id,
                amount: updated.cover_amount,
                action: 'plan_updated',
                details: changes.length > 0 ? changes.join(', ') : 'Settings updated'
            });
            setPaymentLog(getPaymentLog());
            // Reload history to show new entry
            fetchPlanHistory(updated.id).then(setHistory);
            notifyPlansUpdated();
        } catch (err) {
            alert("Failed to update");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedPlan) return;
        try {
            // Log the deletion before it happens
            addToPaymentLog({
                date: new Date().toISOString().split('T')[0],
                planName: selectedPlan.name,
                planId: selectedPlan.id,
                amount: selectedPlan.cover_amount,
                action: 'plan_deleted',
                details: `Cover: ${formatCurrency(selectedPlan.cover_amount)}, Premium: ${formatCurrency(selectedPlan.premium_amount)}`
            });
            setPaymentLog(getPaymentLog());
            await deletePlan(selectedPlan.id);
            setPlans(prev => prev.filter(p => p.id !== selectedPlan.id));
            closeDetails();
            notifyPlansUpdated();
        } catch (err) {
            alert("Failed to delete");
        }
    };

    const handlePointClick = (entry: PlanHistory) => {
        if (bulkEditMode) return;
        if (!entry || !entry.id) {
            alert("Error: Clicked entry has no ID.");
            return;
        }
        setEditHistoryEntry(entry);
        setEditHistDate(entry.date);
        setEditHistCover(entry.cover_amount.toString());
        setEditHistPremium(entry.premium_amount.toString());
        setEditHistNotes(entry.notes || "");
    };

    const handleDeleteHistory = async () => {
        if (!editHistoryEntry || !selectedPlan) return;
        if (!confirm("Delete this history entry?")) return;

        try {
            // Log before deletion
            addToPaymentLog({
                date: new Date().toISOString().split('T')[0],
                planName: selectedPlan.name,
                planId: selectedPlan.id,
                amount: editHistoryEntry.premium_amount,
                action: 'history_deleted',
                details: `Deleted entry: ${editHistoryEntry.date}, Cover: ${formatCurrency(editHistoryEntry.cover_amount)}`
            });
            setPaymentLog(getPaymentLog());
            await deletePlanHistoryEntry(editHistoryEntry.id);
            const updatedHistory = history.filter(h => h.id !== editHistoryEntry.id);
            setHistory(updatedHistory);
            if (selectedPlan) {
                updatePremiumTotal(selectedPlan.id, updatedHistory);
            }
            setEditHistoryEntry(null);
        } catch (err) {
            alert("Failed to delete history entry");
        }
    };

    const handleUpdateHistory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editHistoryEntry || !selectedPlan) return;

        try {
            const dateChanged = editHistDate !== editHistoryEntry.date;
            const updated = await updatePlanHistoryEntry(
                editHistoryEntry.id,
                parseFloat(editHistCover) || 0,
                parseFloat(editHistPremium) || 0,
                editHistNotes,
                dateChanged ? editHistDate : undefined
            );
            // Log the update
            const changes: string[] = [];
            if (dateChanged) changes.push(`Date: ${editHistDate}`);
            if (editHistoryEntry.cover_amount !== updated.cover_amount) changes.push(`Cover: ${formatCurrency(updated.cover_amount)}`);
            if (editHistoryEntry.premium_amount !== updated.premium_amount) changes.push(`Premium: ${formatCurrency(updated.premium_amount)}`);
            addToPaymentLog({
                date: new Date().toISOString().split('T')[0],
                planName: selectedPlan.name,
                planId: selectedPlan.id,
                amount: updated.premium_amount,
                action: 'history_updated',
                details: changes.length > 0 ? changes.join(', ') : 'Entry updated'
            });
            setPaymentLog(getPaymentLog());
            const updatedHistory = history.map(h => h.id === updated.id ? updated : h).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setHistory(updatedHistory);
            if (selectedPlan) {
                updatePremiumTotal(selectedPlan.id, updatedHistory);
            }
            setEditHistoryEntry(null);
        } catch (err) {
            alert("Failed to update history entry");
        }
    };

    // Bulk Edit Functions
    const [newBulkRows, setNewBulkRows] = useState<{ date: string; cover_amount: string; premium_amount: string; notes: string }[]>([]);

    const startBulkEdit = () => {
        setBulkEditMode(true);
        const edits: { [id: number]: { date: string; cover_amount: string; premium_amount: string; notes: string } } = {};
        history.forEach(h => {
            edits[h.id] = { date: h.date, cover_amount: h.cover_amount.toString(), premium_amount: h.premium_amount.toString(), notes: h.notes || "" };
        });
        setBulkEdits(edits);
        setNewBulkRows([]);
    };

    const cancelBulkEdit = () => {
        setBulkEditMode(false);
        setBulkEdits({});
        setNewBulkRows([]);
    };

    const addBulkRow = () => {
        setNewBulkRows(prev => [...prev, { date: new Date().toISOString().split('T')[0], cover_amount: '', premium_amount: '', notes: '' }]);
    };

    const updateNewBulkRow = (index: number, field: string, value: string) => {
        setNewBulkRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
    };

    const removeNewBulkRow = (index: number) => {
        setNewBulkRows(prev => prev.filter((_, i) => i !== index));
    };

    const handleBulkSave = async () => {
        if (!selectedPlan) return;

        // Update existing entries
        const updates = Object.entries(bulkEdits).map(async ([id, { date, cover_amount, premium_amount, notes }]) => {
            const original = history.find(h => h.id === Number(id));
            if (original && (
                original.date !== date ||
                original.cover_amount.toString() !== cover_amount ||
                original.premium_amount.toString() !== premium_amount ||
                (original.notes || "") !== notes
            )) {
                const dateChanged = original.date !== date;
                return updatePlanHistoryEntry(Number(id), parseFloat(cover_amount) || 0, parseFloat(premium_amount) || 0, notes, dateChanged ? date : undefined);
            }
            return null;
        });

        // Create new entries
        const creates = newBulkRows
            .filter(row => row.date && row.cover_amount)
            .map(row => createPlanHistoryEntry(selectedPlan.id, row.date, parseFloat(row.cover_amount) || 0, parseFloat(row.premium_amount) || 0, row.notes));

        try {
            await Promise.all([...updates, ...creates]);
            const newHistory = await fetchPlanHistory(selectedPlan.id);
            setHistory(newHistory);
            updatePremiumTotal(selectedPlan.id, newHistory);
            setBulkEditMode(false);
            setBulkEdits({});
            setNewBulkRows([]);
        } catch (err) {
            alert("Failed to save some entries");
        }
    };

    // Calculate next premium date based on frequency
    const calculateNextPremiumDate = (plan: Plan): string => {
        const currentDate = plan.next_premium_date ? new Date(plan.next_premium_date) : new Date();
        let nextDate = new Date(currentDate);

        switch (plan.premium_frequency) {
            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
            case 'quarterly':
                nextDate.setMonth(nextDate.getMonth() + 3);
                break;
            case 'half_yearly':
                nextDate.setMonth(nextDate.getMonth() + 6);
                break;
            case 'yearly':
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                break;
            case 'custom':
                if (plan.custom_frequency_days) {
                    nextDate.setDate(nextDate.getDate() + plan.custom_frequency_days);
                }
                break;
        }

        return nextDate.toISOString().split('T')[0];
    };

    // Check if next premium date would exceed expiry date
    const wouldNextPremiumExceedExpiry = (plan: Plan): boolean => {
        if (!plan.expiry_date) return false; // No expiry, always show Mark Paid
        const nextPremiumDate = calculateNextPremiumDate(plan);
        const expiryDate = new Date(plan.expiry_date);
        const nextDate = new Date(nextPremiumDate);
        return nextDate > expiryDate;
    };

    // Open Mark Paid confirmation modal
    const openMarkPaidModal = (plan: Plan) => {
        setMarkPaidPlan(plan);
        setMarkPaidNextDate(calculateNextPremiumDate(plan));
    };

    // Confirm and execute Mark Paid
    const confirmMarkPaid = async () => {
        if (!markPaidPlan) return;

        const plan = markPaidPlan;
        const nextPremiumStr = markPaidNextDate;
        const paymentDate = new Date().toISOString().split('T')[0]; // Today's date for the history entry

        try {
            // Update plan with next premium date
            const updated = await updatePlan(
                plan.id,
                plan.cover_amount,
                plan.premium_amount,
                plan.premium_frequency,
                plan.expiry_date || undefined,
                nextPremiumStr,
                plan.notes
            );
            setPlans(prev => prev.map(p => p.id === updated.id ? updated : p));
            if (selectedPlan && selectedPlan.id === updated.id) {
                setSelectedPlan(updated);
                setEditNextPremium(nextPremiumStr);
            }

            // Create history entry for this payment
            try {
                await createPlanHistoryEntry(
                    plan.id,
                    paymentDate,
                    plan.cover_amount,
                    plan.premium_amount,
                    `Premium paid (${getFrequencyLabel(plan.premium_frequency, plan.custom_frequency_days)})`
                );
            } catch (historyErr) {
                console.error("Failed to create history entry:", historyErr);
                alert("Plan updated but failed to add history entry. Please add it manually.");
            }

            // Log the payment
            addToPaymentLog({
                date: paymentDate,
                planName: plan.name,
                planId: plan.id,
                amount: plan.premium_amount,
                action: 'premium_paid',
                details: `Premium: ${formatCurrency(plan.premium_amount)} (${getFrequencyLabel(plan.premium_frequency, plan.custom_frequency_days)}). Next due: ${new Date(nextPremiumStr).toLocaleDateString()}`
            });
            setPaymentLog(getPaymentLog());

            // Always refresh history and update premium total
            try {
                const newHistory = await fetchPlanHistory(updated.id);
                if (selectedPlan && selectedPlan.id === updated.id) {
                    setHistory(newHistory);
                }
                updatePremiumTotal(updated.id, newHistory);
            } catch (historyFetchErr) {
                console.error("Failed to refresh history:", historyFetchErr);
            }

            notifyPlansUpdated();
            // Close modal
            setMarkPaidPlan(null);
            setMarkPaidNextDate("");
        } catch (err) {
            alert("Failed to update");
        }
    };

    // Cancel Mark Paid
    const cancelMarkPaid = () => {
        setMarkPaidPlan(null);
        setMarkPaidNextDate("");
    };

    // Acknowledge expired plan
    const handleAcknowledgeExpired = (plan: Plan) => {
        const newAcknowledged = [...acknowledgedExpired, plan.id];
        setAcknowledgedExpired(newAcknowledged);
        saveAcknowledgedExpired(newAcknowledged);
        // Log the acknowledgement
        addToPaymentLog({
            date: new Date().toISOString().split('T')[0],
            planName: plan.name,
            planId: plan.id,
            amount: 0,
            action: 'plan_expired_ack',
            details: `Expired on: ${plan.expiry_date || 'N/A'}`
        });
        setPaymentLog(getPaymentLog());
        notifyPlansUpdated();
    };

    // Delete expired plan
    const handleDeleteExpired = async (plan: Plan, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`Are you sure you want to delete "${plan.name}"? This cannot be undone.`)) {
            return;
        }

        try {
            // Log the deletion before it happens
            addToPaymentLog({
                date: new Date().toISOString().split('T')[0],
                planName: plan.name,
                planId: plan.id,
                amount: plan.cover_amount,
                action: 'plan_deleted',
                details: `Expired plan deleted. Cover: ${formatCurrency(plan.cover_amount)}, Premium: ${formatCurrency(plan.premium_amount)}`
            });
            setPaymentLog(getPaymentLog());
            await deletePlan(plan.id);
            setPlans(prev => prev.filter(p => p.id !== plan.id));
            // Remove from acknowledged list if it was there
            setAcknowledgedExpired(prev => prev.filter(id => id !== plan.id));
            notifyPlansUpdated();
        } catch (err) {
            alert("Failed to delete plan");
        }
    };

    // Delete activity log entry
    const handleDeleteLogEntry = (id: string) => {
        if (!confirm('Delete this log entry?')) return;
        const log = getPaymentLog().filter(entry => entry.id !== id);
        savePaymentLog(log);
        setPaymentLog(log);
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

    const parseCSV = (text: string): { date: string; cover_amount: number; premium_amount: number; notes: string }[] => {
        const lines = text.trim().split('\n');
        const results: { date: string; cover_amount: number; premium_amount: number; notes: string }[] = [];

        const startIndex = lines[0]?.toLowerCase().includes('date') ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.match(/(".*?"|[^,]+)/g) || [];
            if (parts.length >= 3) {
                const date = (parts[0] || '').replace(/"/g, '').trim();
                const cover_amount = parseFloat((parts[1] || '').replace(/"/g, '').trim()) || 0;
                const premium_amount = parseFloat((parts[2] || '').replace(/"/g, '').trim()) || 0;
                const notes = parts[3]?.replace(/"/g, '').trim() || "";

                if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                    results.push({ date, cover_amount, premium_amount, notes });
                }
            }
        }
        return results;
    };

    const handleImportCSV = async () => {
        if (!selectedPlan || !csvText.trim()) return;

        const entries = parseCSV(csvText);
        if (entries.length === 0) {
            alert("No valid entries found. Format: Date,Cover,Premium,Notes (YYYY-MM-DD)");
            return;
        }

        try {
            for (const entry of entries) {
                await createPlanHistoryEntry(selectedPlan.id, entry.date, entry.cover_amount, entry.premium_amount, entry.notes);
            }

            const newHistory = await fetchPlanHistory(selectedPlan.id);
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

        const headers = "Date,Cover,Premium,Notes\n";
        const rows = history.map(h => `${h.date},${h.cover_amount},${h.premium_amount},"${(h.notes || '').replace(/"/g, '""')}"`).join("\n");
        const csvContent = "data:text/csv;charset=utf-8," + headers + rows;

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${selectedPlan?.name}_history.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCreateHistory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPlan || !newHistDate || !newHistCover) return;

        try {
            const entry = await createPlanHistoryEntry(
                selectedPlan.id,
                newHistDate,
                parseFloat(newHistCover) || 0,
                parseFloat(newHistPremium) || 0,
                newHistNotes
            );
            // Log the addition
            addToPaymentLog({
                date: new Date().toISOString().split('T')[0],
                planName: selectedPlan.name,
                planId: selectedPlan.id,
                amount: entry.premium_amount,
                action: 'history_added',
                details: `Added: ${newHistDate}, Cover: ${formatCurrency(entry.cover_amount)}, Premium: ${formatCurrency(entry.premium_amount)}`
            });
            setPaymentLog(getPaymentLog());
            const updatedHistory = [...history, entry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setHistory(updatedHistory);
            if (selectedPlan) {
                updatePremiumTotal(selectedPlan.id, updatedHistory);
            }
            setNewHistDate("");
            setNewHistCover("");
            setNewHistPremium("");
            setNewHistNotes("");
            setShowAddHistory(false);
        } catch (err) {
            alert("Failed to add history entry");
        }
    };

    // Notes/Reflection functions
    const startEditNote = (year: string) => {
        setEditingNoteYear(year);
        setNoteValue(insuranceNotes[year] || '');
    };

    const saveNote = () => {
        if (!editingNoteYear) return;
        const newNotes = { ...insuranceNotes };
        if (noteValue.trim()) {
            newNotes[editingNoteYear] = noteValue.trim();
        } else {
            delete newNotes[editingNoteYear];
        }
        setInsuranceNotes(newNotes);
        saveInsuranceNotes(newNotes);
        setEditingNoteYear(null);
    };

    const handleNoteKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setEditingNoteYear(null);
        }
    };

    // Get years for reflection (current + past 2 years)
    const reflectionYears = [currentYearStr, (currentYear - 1).toString(), (currentYear - 2).toString()];

    // Calculate totals and alerts - only for active (non-expired) plans
    const activePlans = plans.filter(p => !isExpired(p.expiry_date));
    const totalAnnualPremium = activePlans.reduce((sum, p) => sum + getAnnualPremium(p.premium_amount, p.premium_frequency, p.custom_frequency_days), 0);
    const expiringSoonPlans = plans.filter(p => isExpiringSoon(p.expiry_date, 60));
    const expiredPlans = plans.filter(p => isExpired(p.expiry_date));
    const unacknowledgedExpiredPlans = expiredPlans.filter(p => !acknowledgedExpired.includes(p.id));
    // Premium due only for non-expired plans
    const premiumDuePlans = activePlans.filter(p => isPremiumDue(p.next_premium_date, 15, p.expiry_date));
    const premiumOverduePlans = activePlans.filter(p => isPremiumOverdue(p.next_premium_date, p.expiry_date));
    const actionNeededCount = premiumOverduePlans.length + premiumDuePlans.length + unacknowledgedExpiredPlans.length;

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

    return (
        <div style={{ maxWidth: '1200px' }}>
            {/* Premium Due Alert Bar */}
            {(premiumOverduePlans.length > 0 || premiumDuePlans.length > 0) && (
                <div style={{
                    marginBottom: '16px',
                    padding: '14px 20px',
                    borderRadius: '8px',
                    background: premiumOverduePlans.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                    border: `1px solid ${premiumOverduePlans.length > 0 ? 'var(--accent-danger)' : 'var(--accent-primary)'}`,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <span style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: premiumOverduePlans.length > 0 ? 'var(--accent-danger)' : 'var(--accent-primary)',
                            animation: 'pulse 1.5s infinite'
                        }} />
                        <div style={{ flex: 1 }}>
                            {premiumOverduePlans.length > 0 && (
                                <div style={{ color: 'var(--accent-danger)', fontWeight: '600', marginBottom: premiumDuePlans.length > 0 ? '4px' : '0' }}>
                                    OVERDUE: {premiumOverduePlans.map(p => `${p.name} (${Math.abs(getDaysUntil(p.next_premium_date) || 0)}d ago)`).join(', ')}
                                </div>
                            )}
                            {premiumDuePlans.length > 0 && (
                                <div style={{ color: 'var(--accent-primary)', fontWeight: '500' }}>
                                    Premium Due: {premiumDuePlans.map(p => `${p.name} (${getDaysUntil(p.next_premium_date)}d)`).join(', ')}
                                </div>
                            )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Click plan to update after payment
                        </div>
                    </div>
                </div>
            )}

            {/* Expiring Soon Alert Bar */}
            {(expiringSoonPlans.length > 0 || unacknowledgedExpiredPlans.length > 0) && (
                <div style={{
                    marginBottom: '24px',
                    padding: '14px 20px',
                    borderRadius: '8px',
                    background: unacknowledgedExpiredPlans.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    border: `1px solid ${unacknowledgedExpiredPlans.length > 0 ? 'var(--accent-danger)' : 'var(--accent-warning)'}`,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.2rem' }}>!</span>
                        <div style={{ flex: 1 }}>
                            {unacknowledgedExpiredPlans.length > 0 && (
                                <div style={{ color: 'var(--accent-danger)', fontWeight: '600', marginBottom: expiringSoonPlans.length > 0 ? '8px' : '0' }}>
                                    {unacknowledgedExpiredPlans.length} plan(s) expired: {unacknowledgedExpiredPlans.map(p => p.name).join(', ')}
                                </div>
                            )}
                            {expiringSoonPlans.length > 0 && (
                                <div style={{ color: 'var(--accent-warning)', fontWeight: '500' }}>
                                    {expiringSoonPlans.length} plan(s) expiring soon: {expiringSoonPlans.map(p => {
                                        const days = getDaysUntil(p.expiry_date);
                                        return `${p.name} (${days}d)`;
                                    }).join(', ')}
                                </div>
                            )}
                        </div>
                        {unacknowledgedExpiredPlans.length > 0 && (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {unacknowledgedExpiredPlans.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => handleAcknowledgeExpired(p)}
                                        style={{
                                            padding: '6px 12px',
                                            background: 'var(--bg-panel)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '0.75rem',
                                            color: 'var(--text-primary)'
                                        }}
                                        title={`Acknowledge ${p.name} as expired`}
                                    >
                                        Dismiss {p.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: '600', margin: 0 }}>Insurance</h1>
                    {actionNeededCount > 0 && (
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '22px',
                            height: '22px',
                            borderRadius: '11px',
                            background: 'var(--accent-danger)',
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            padding: '0 6px'
                        }}>
                            {actionNeededCount}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '32px' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Annual Premium</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--accent-warning)' }}>
                            {formatCurrency(totalAnnualPremium)}
                        </div>
                    </div>
                </div>
            </div>

            {/* View Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                <button
                    onClick={() => setViewTab('all')}
                    style={{
                        padding: '8px 16px',
                        background: viewTab === 'all' ? 'var(--accent-primary)' : 'var(--bg-panel)',
                        color: viewTab === 'all' ? '#fff' : 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '500'
                    }}
                >
                    All Plans
                </button>
                <button
                    onClick={() => setViewTab('yearly')}
                    style={{
                        padding: '8px 16px',
                        background: viewTab === 'yearly' ? 'var(--accent-primary)' : 'var(--bg-panel)',
                        color: viewTab === 'yearly' ? '#fff' : 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '500'
                    }}
                >
                    {currentYear} Premiums
                </button>
            </div>

            {/* Yearly Premiums View */}
            {viewTab === 'yearly' && (
                <div style={{ marginBottom: '32px' }}>
                    <div className="glass-panel" style={{ padding: '20px' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>Premium Payments for {currentYear}</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Plan</th>
                                    <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Frequency</th>
                                    <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Premium</th>
                                    <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Next Due</th>
                                    <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status</th>
                                    <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activePlans.map(plan => {
                                    const premiumOverdue = isPremiumOverdue(plan.next_premium_date, plan.expiry_date);
                                    const premiumDueNow = isPremiumDue(plan.next_premium_date, 15, plan.expiry_date);
                                    const premiumDays = getDaysUntil(plan.next_premium_date);

                                    return (
                                        <tr key={plan.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '12px 8px', fontWeight: '500' }}>{plan.name}</td>
                                            <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.85rem' }}>
                                                {getFrequencyLabel(plan.premium_frequency, plan.custom_frequency_days)}
                                            </td>
                                            <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', color: 'var(--accent-warning)' }}>
                                                {formatCurrency(plan.premium_amount)}
                                            </td>
                                            <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.85rem' }}>
                                                {plan.next_premium_date ? new Date(plan.next_premium_date).toLocaleDateString() : '-'}
                                            </td>
                                            <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                                {premiumOverdue ? (
                                                    <span style={{ color: 'var(--accent-danger)', fontWeight: '600', fontSize: '0.8rem' }}>
                                                        Overdue ({Math.abs(premiumDays || 0)}d)
                                                    </span>
                                                ) : premiumDueNow ? (
                                                    <span style={{ color: 'var(--accent-primary)', fontWeight: '600', fontSize: '0.8rem' }}>
                                                        Due in {premiumDays}d
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--accent-success)', fontSize: '0.8rem' }}>
                                                        OK
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                                {wouldNextPremiumExceedExpiry(plan) ? (
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                        Final payment
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => openMarkPaidModal(plan)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            background: premiumOverdue || premiumDueNow ? 'var(--accent-success)' : 'var(--bg-panel)',
                                                            color: premiumOverdue || premiumDueNow ? '#fff' : 'var(--text-primary)',
                                                            border: premiumOverdue || premiumDueNow ? 'none' : '1px solid var(--border-color)',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '500'
                                                        }}
                                                    >
                                                        Mark Paid
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: 'var(--bg-panel)' }}>
                                    <td colSpan={2} style={{ padding: '12px 8px', fontWeight: '600' }}>Total Annual Premium</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '700', color: 'var(--accent-warning)', fontSize: '1.1rem' }}>
                                        {formatCurrency(totalAnnualPremium)}
                                    </td>
                                    <td colSpan={3}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* Plans Grid */}
            {viewTab === 'all' && (
            <>
            {/* Active (Ongoing) Plans Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {activePlans.map(plan => {
                    const expiryDays = getDaysUntil(plan.expiry_date);
                    const expiringSoon = isExpiringSoon(plan.expiry_date, 60);
                    const premiumOverdue = isPremiumOverdue(plan.next_premium_date, plan.expiry_date);
                    const premiumDue = isPremiumDue(plan.next_premium_date, 15, plan.expiry_date);
                    const premiumDays = getDaysUntil(plan.next_premium_date);
                    
                    // Calculate total premium paid from history (will be loaded when plan is opened)
                    // For now, we'll need to fetch it or calculate it when plan details are opened
                    // Since history is only loaded when plan is selected, we'll add a state to track totals

                    return (
                        <div
                            key={plan.id}
                            className="glass-panel"
                            style={{
                                padding: '20px',
                                cursor: 'pointer',
                                transition: 'transform 0.15s, box-shadow 0.15s',
                                borderLeft: expiringSoon ? '4px solid var(--accent-warning)' : '4px solid transparent',
                                position: 'relative',
                            }}
                            onClick={() => openPlanDetails(plan)}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            {/* Action Needed Indicator (Red Dot) */}
                            {(premiumOverdue || premiumDue) && (
                                <span style={{
                                    position: 'absolute',
                                    top: '12px',
                                    right: '12px',
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    background: premiumOverdue ? 'var(--accent-danger)' : 'var(--accent-primary)',
                                    boxShadow: `0 0 0 3px ${premiumOverdue ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)'}`,
                                }} title={premiumOverdue ? 'Premium overdue!' : 'Premium due soon'} />
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', paddingRight: '24px' }}>{plan.name}</div>
                                {expiringSoon && (
                                    <span style={{
                                        fontSize: '0.7rem',
                                        padding: '3px 8px',
                                        borderRadius: '12px',
                                        background: 'var(--accent-warning)',
                                        color: 'white',
                                        fontWeight: '500',
                                        flexShrink: 0,
                                    }}>
                                        {expiryDays}d left
                                    </span>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Cover</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--accent-success)' }}>
                                        {formatCurrency(plan.cover_amount)}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Premium</div>
                                    <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--accent-warning)' }}>
                                        {formatCurrency(plan.premium_amount)}
                                        <span style={{ fontSize: '0.7rem', fontWeight: '400', color: 'var(--text-secondary)', marginLeft: '4px' }}>
                                            /{plan.premium_frequency === 'custom' ? `${plan.custom_frequency_days}d` : getFrequencyLabel(plan.premium_frequency).toLowerCase().replace('ly', '')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Total Premium Paid */}
                            <div style={{ marginBottom: '12px', padding: '8px', background: 'var(--bg-panel)', borderRadius: '6px' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Total Premium Paid</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--accent-warning)' }}>
                                    {formatCurrency(planPremiumTotals[plan.id] || 0)}
                                </div>
                            </div>

                            {/* Next Premium Due */}
                            {plan.next_premium_date && (
                                <div style={{
                                    fontSize: '0.8rem',
                                    color: premiumOverdue ? 'var(--accent-danger)' : premiumDue ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                    fontWeight: premiumOverdue || premiumDue ? '600' : '400',
                                    marginBottom: '4px'
                                }}>
                                    {premiumOverdue
                                        ? `Premium overdue by ${Math.abs(premiumDays || 0)} days!`
                                        : premiumDue
                                            ? `Premium due in ${premiumDays} days`
                                            : `Next premium: ${new Date(plan.next_premium_date).toLocaleDateString()}`
                                    }
                                </div>
                            )}

                            {plan.expiry_date && !expiringSoon && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    Expires: {new Date(plan.expiry_date).toLocaleDateString()}
                                </div>
                            )}

                            {plan.notes && (
                                <div style={{
                                    marginTop: '8px',
                                    fontSize: '0.8rem',
                                    color: 'var(--text-secondary)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    {plan.notes.split('\n')[0]}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Add Plan Tile */}
                {!isCreating ? (
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
                            <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '12px' }}>New Plan</div>
                            <input
                                type="text"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="Plan Name"
                                style={{ marginBottom: '8px' }}
                                autoFocus
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                <input
                                    type="number"
                                    value={newCover}
                                    onChange={e => setNewCover(e.target.value)}
                                    placeholder="Cover Amount"
                                />
                                <input
                                    type="number"
                                    value={newPremium}
                                    onChange={e => setNewPremium(e.target.value)}
                                    placeholder="Premium"
                                />
                            </div>
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
                                    {PREMIUM_FREQUENCIES.map(f => (
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
                                    type="text"
                                    value={newExpiry}
                                    onChange={e => setNewExpiry(e.target.value)}
                                    placeholder="YYYY-MM-DD"
                                    pattern="\d{4}-\d{2}-\d{2}"
                                    title="Expiry Date"
                                />
                            </div>
                            <div style={{ marginBottom: '8px' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Next Premium Date</label>
                                <input
                                    type="text"
                                    value={newNextPremium}
                                    onChange={e => setNewNextPremium(e.target.value)}
                                    placeholder="YYYY-MM-DD"
                                    pattern="\d{4}-\d{2}-\d{2}"
                                    title="Next Premium Date"
                                />
                            </div>
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
                                    onClick={() => { setIsCreating(false); setNewName(""); setNewCover(""); setNewPremium(""); setNewFrequency("yearly"); setNewExpiry(""); setNewNextPremium(""); setNewNotes(""); }}
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

            {/* Expired Plans Section - Collapsible */}
            {expiredPlans.length > 0 && (
                <div style={{ marginTop: '32px' }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '16px',
                            cursor: 'pointer',
                            padding: '12px 16px',
                            background: 'rgba(239, 68, 68, 0.05)',
                            borderRadius: '8px',
                            border: '1px solid rgba(239, 68, 68, 0.2)'
                        }}
                        onClick={() => setExpiredCollapsed(!expiredCollapsed)}
                    >
                        <span style={{
                            fontSize: '1rem',
                            color: 'var(--accent-danger)',
                            transition: 'transform 0.2s',
                            transform: expiredCollapsed ? 'rotate(0)' : 'rotate(90deg)'
                        }}>
                            &#9654;
                        </span>
                        <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--accent-danger)' }}>
                            Expired ({expiredPlans.length})
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {expiredCollapsed ? 'click to expand' : 'click to collapse'}
                        </span>
                    </div>

                    {!expiredCollapsed && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {expiredPlans.map(plan => {
                                const isAcknowledged = acknowledgedExpired.includes(plan.id);
                                const expiryDays = getDaysUntil(plan.expiry_date);

                                return (
                                    <div
                                        key={plan.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '12px 16px',
                                            background: 'var(--bg-panel)',
                                            borderRadius: '8px',
                                            borderLeft: '3px solid var(--accent-danger)',
                                            opacity: isAcknowledged ? 0.5 : 0.8,
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => openPlanDetails(plan)}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div>
                                                <div style={{ fontWeight: '500', marginBottom: '2px' }}>{plan.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                    Expired {expiryDays ? `${Math.abs(expiryDays)} days ago` : 'on ' + new Date(plan.expiry_date!).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cover</div>
                                                <div style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>{formatCurrency(plan.cover_amount)}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {!isAcknowledged && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAcknowledgeExpired(plan);
                                                        }}
                                                        style={{
                                                            padding: '6px 12px',
                                                            background: 'transparent',
                                                            border: '1px solid var(--border-color)',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            fontSize: '0.75rem',
                                                            color: 'var(--text-secondary)'
                                                        }}
                                                    >
                                                        Acknowledge
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => handleDeleteExpired(plan, e)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        background: 'var(--accent-danger)',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.75rem',
                                                        color: '#fff',
                                                        fontWeight: '500'
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
            </>
            )}

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
                                {INSURANCE_REFLECTION_PROMPTS.map((prompt, idx) => (
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
                                            {year} {year === currentYearStr && <span style={{ fontSize: '0.7rem', color: 'var(--accent-success)', marginLeft: '6px' }}>Current</span>}
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
                                                {insuranceNotes[year] ? 'Edit' : 'Add Notes'}
                                            </button>
                                        )}
                                    </div>

                                    {editingNoteYear === year ? (
                                        <div>
                                            <textarea
                                                value={noteValue}
                                                onChange={e => setNoteValue(e.target.value)}
                                                onKeyDown={handleNoteKeyDown}
                                                placeholder="Write your insurance reflections for this year..."
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
                                            color: insuranceNotes[year] ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            lineHeight: '1.6',
                                            whiteSpace: 'pre-wrap',
                                            minHeight: '60px'
                                        }}>
                                            {insuranceNotes[year] || 'No notes yet. Click "Add Notes" to write your reflections.'}
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
                        {showPaymentLog && paymentLog.length > 0 && (
                            <button
                                onClick={() => exportLogAsCSV(paymentLog)}
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
                            onClick={() => setShowPaymentLog(!showPaymentLog)}
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
                            {showPaymentLog ? 'Hide' : 'Show'} ({paymentLog.length} entries)
                        </button>
                    </div>
                </div>
                {showPaymentLog && (
                    <div className="glass-panel" style={{ padding: '16px', maxHeight: '400px', overflowY: 'auto' }}>
                        {paymentLog.length === 0 ? (
                            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                                No activity records yet. Records will appear here when you perform actions on plans.
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ textAlign: 'left', padding: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Date</th>
                                        <th style={{ textAlign: 'left', padding: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Plan</th>
                                        <th style={{ textAlign: 'left', padding: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Action</th>
                                        <th style={{ textAlign: 'right', padding: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Amount</th>
                                        <th style={{ textAlign: 'left', padding: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Details</th>
                                        <th style={{ width: '60px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paymentLog.map(entry => {
                                        const actionColor =
                                            entry.action === 'premium_paid' ? 'var(--accent-success)' :
                                            entry.action === 'plan_created' ? 'var(--accent-primary)' :
                                            entry.action === 'plan_updated' ? 'var(--accent-warning)' :
                                            entry.action === 'plan_deleted' ? 'var(--accent-danger)' :
                                            entry.action === 'history_added' ? 'var(--accent-primary)' :
                                            entry.action === 'history_updated' ? 'var(--accent-warning)' :
                                            entry.action === 'history_deleted' ? 'var(--accent-danger)' :
                                            'var(--text-secondary)';

                                        return (
                                            <tr key={entry.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '8px', fontSize: '0.85rem' }}>
                                                    {new Date(entry.date).toLocaleDateString()}
                                                </td>
                                                <td style={{ padding: '8px', fontSize: '0.85rem', fontWeight: '500' }}>
                                                    {entry.planName}
                                                </td>
                                                <td style={{ padding: '8px' }}>
                                                    <span style={{
                                                        fontSize: '0.7rem',
                                                        padding: '2px 8px',
                                                        borderRadius: '10px',
                                                        background: actionColor,
                                                        color: 'white'
                                                    }}>
                                                        {getActionLabel(entry.action)}
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

            {/* Plan Details Modal */}
            {selectedPlan && (
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
                            width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto',
                            backgroundColor: 'var(--bg-app)', padding: '28px', borderRadius: '12px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{selectedPlan.name}</h2>
                            <button
                                onClick={closeDetails}
                                style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
                            >
                                &times;
                            </button>
                        </div>

                        {/* Update Form */}
                        <form onSubmit={handleUpdate} style={{ marginBottom: '24px' }}>
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
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Cover Amount</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editCover}
                                        onChange={e => setEditCover(e.target.value)}
                                        style={{ fontSize: '1.1rem', fontWeight: '600' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Premium</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editPremium}
                                        onChange={e => setEditPremium(e.target.value)}
                                        style={{ fontSize: '1.1rem', fontWeight: '600' }}
                                    />
                                </div>
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
                                        {PREMIUM_FREQUENCIES.map(f => (
                                            <option key={f.value} value={f.value}>{f.label}</option>
                                        ))}
                                    </select>
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
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Expiry Date</label>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            value={editExpiry}
                                            onChange={e => setEditExpiry(e.target.value)}
                                            placeholder="YYYY-MM-DD"
                                            pattern="\d{4}-\d{2}-\d{2}"
                                            style={{ flex: 1 }}
                                        />
                                        {editExpiry !== (selectedPlan.expiry_date || '') && (
                                            <button
                                                type="submit"
                                                disabled={saving}
                                                style={{
                                                    padding: '8px 12px',
                                                    background: 'var(--accent-primary)',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '500',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {saving ? '...' : 'Save'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {/* Next Premium Date - Only show for non-expired plans */}
                                {!isExpired(selectedPlan.expiry_date) && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                            Next Premium Date
                                            {isPremiumOverdue(selectedPlan.next_premium_date, selectedPlan.expiry_date) && <span style={{ color: 'var(--accent-danger)', marginLeft: '8px' }}>OVERDUE!</span>}
                                            {isPremiumDue(selectedPlan.next_premium_date, 15, selectedPlan.expiry_date) && !isPremiumOverdue(selectedPlan.next_premium_date, selectedPlan.expiry_date) && <span style={{ color: 'var(--accent-primary)', marginLeft: '8px' }}>Due Soon</span>}
                                        </label>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <input
                                                type="text"
                                                value={editNextPremium}
                                                onChange={e => setEditNextPremium(e.target.value)}
                                                placeholder="YYYY-MM-DD"
                                                pattern="\d{4}-\d{2}-\d{2}"
                                                style={{
                                                    flex: 1,
                                                    borderColor: isPremiumOverdue(selectedPlan.next_premium_date, selectedPlan.expiry_date) ? 'var(--accent-danger)' : undefined
                                                }}
                                            />
                                            {!wouldNextPremiumExceedExpiry(selectedPlan) ? (
                                                <button
                                                    type="button"
                                                    onClick={() => openMarkPaidModal(selectedPlan)}
                                                    style={{
                                                        padding: '8px 12px',
                                                        background: isPremiumOverdue(selectedPlan.next_premium_date, selectedPlan.expiry_date) || isPremiumDue(selectedPlan.next_premium_date, 15, selectedPlan.expiry_date) ? 'var(--accent-success)' : 'var(--bg-panel)',
                                                        color: isPremiumOverdue(selectedPlan.next_premium_date, selectedPlan.expiry_date) || isPremiumDue(selectedPlan.next_premium_date, 15, selectedPlan.expiry_date) ? '#fff' : 'var(--text-primary)',
                                                        border: isPremiumOverdue(selectedPlan.next_premium_date, selectedPlan.expiry_date) || isPremiumDue(selectedPlan.next_premium_date, 15, selectedPlan.expiry_date) ? 'none' : '1px solid var(--border-color)',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '500',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                    title="Mark premium as paid and set next due date"
                                                >
                                                    Mark Paid
                                                </button>
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '8px', background: 'var(--bg-panel)', borderRadius: '6px' }}>
                                                    Final
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                            {wouldNextPremiumExceedExpiry(selectedPlan)
                                                ? 'No more payments needed - next would exceed expiry'
                                                : 'Click "Mark Paid" to record payment and set next due date'}
                                        </div>
                                    </div>
                                )}
                                {/* Expired notice */}
                                {isExpired(selectedPlan.expiry_date) && (
                                    <div style={{
                                        padding: '12px',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid var(--accent-danger)',
                                        borderRadius: '8px',
                                        color: 'var(--accent-danger)',
                                        fontSize: '0.85rem'
                                    }}>
                                        This plan has expired. Premium payments are no longer tracked.
                                    </div>
                                )}
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Notes</label>
                                <textarea
                                    value={editNotes}
                                    onChange={e => setEditNotes(e.target.value)}
                                    placeholder="Policy details, benefits, claims process..."
                                    rows={3}
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
                                            Format: Date,Cover,Premium,Notes (Date as YYYY-MM-DD)
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
                                        <div style={{ display: 'grid', gridTemplateColumns: '120px 120px 120px 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Date</label>
                                                <input
                                                    type="text"
                                                    value={newHistDate}
                                                    onChange={e => setNewHistDate(e.target.value)}
                                                    placeholder="YYYY-MM-DD"
                                                    pattern="\d{4}-\d{2}-\d{2}"
                                                    required
                                                    style={{ padding: '8px' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Cover</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={newHistCover}
                                                    onChange={e => setNewHistCover(e.target.value)}
                                                    required
                                                    placeholder="0.00"
                                                    style={{ padding: '8px' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Premium</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={newHistPremium}
                                                    onChange={e => setNewHistPremium(e.target.value)}
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
                                            <div style={{ background: 'var(--bg-panel)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                                                <PlanHistoryGraph data={history} onPointClick={handlePointClick} />
                                            </div>
                                        )}

                                        {/* Bulk Edit Table */}
                                        {bulkEditMode && (
                                            <div style={{ background: 'var(--bg-panel)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                                                <div style={{ maxHeight: '350px', overflowY: 'auto', marginBottom: '12px' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                        <thead>
                                                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                                <th style={{ textAlign: 'left', padding: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Date</th>
                                                                <th style={{ textAlign: 'left', padding: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cover</th>
                                                                <th style={{ textAlign: 'left', padding: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Premium</th>
                                                                <th style={{ textAlign: 'left', padding: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Notes</th>
                                                                <th style={{ width: '40px' }}></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {history.map(h => (
                                                                <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                                    <td style={{ padding: '8px' }}>
                                                                        <input
                                                                            type="text"
                                                                            value={bulkEdits[h.id]?.date || h.date}
                                                                            onChange={e => setBulkEdits(prev => ({ ...prev, [h.id]: { ...prev[h.id], date: e.target.value, cover_amount: prev[h.id]?.cover_amount || h.cover_amount.toString(), premium_amount: prev[h.id]?.premium_amount || h.premium_amount.toString(), notes: prev[h.id]?.notes || h.notes || '' } }))}
                                                                            placeholder="YYYY-MM-DD"
                                                                            pattern="\d{4}-\d{2}-\d{2}"
                                                                            style={{ padding: '6px' }}
                                                                        />
                                                                    </td>
                                                                    <td style={{ padding: '8px' }}>
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            value={bulkEdits[h.id]?.cover_amount || ''}
                                                                            onChange={e => setBulkEdits(prev => ({ ...prev, [h.id]: { ...prev[h.id], cover_amount: e.target.value } }))}
                                                                            style={{ width: '100px', padding: '6px' }}
                                                                        />
                                                                    </td>
                                                                    <td style={{ padding: '8px' }}>
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            value={bulkEdits[h.id]?.premium_amount || ''}
                                                                            onChange={e => setBulkEdits(prev => ({ ...prev, [h.id]: { ...prev[h.id], premium_amount: e.target.value } }))}
                                                                            style={{ width: '100px', padding: '6px' }}
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
                                                                <tr key={`new-${index}`} style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(99, 102, 241, 0.05)' }}>
                                                                    <td style={{ padding: '8px' }}>
                                                                        <input
                                                                            type="text"
                                                                            value={row.date}
                                                                            onChange={e => updateNewBulkRow(index, 'date', e.target.value)}
                                                                            placeholder="YYYY-MM-DD"
                                                                            pattern="\d{4}-\d{2}-\d{2}"
                                                                            style={{ padding: '6px' }}
                                                                        />
                                                                    </td>
                                                                    <td style={{ padding: '8px' }}>
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            value={row.cover_amount}
                                                                            onChange={e => updateNewBulkRow(index, 'cover_amount', e.target.value)}
                                                                            placeholder="Cover"
                                                                            style={{ width: '100px', padding: '6px' }}
                                                                        />
                                                                    </td>
                                                                    <td style={{ padding: '8px' }}>
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            value={row.premium_amount}
                                                                            onChange={e => updateNewBulkRow(index, 'premium_amount', e.target.value)}
                                                                            placeholder="Premium"
                                                                            style={{ width: '100px', padding: '6px' }}
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
                                                                            title="Remove row"
                                                                        >
                                                                            &times;
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <button
                                                    onClick={addBulkRow}
                                                    style={{ fontSize: '0.8rem', padding: '6px 12px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
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
                                                <form onSubmit={handleUpdateHistory} style={{ display: 'grid', gridTemplateColumns: '120px 120px 120px 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Date</label>
                                        <input
                                            type="text"
                                            value={editHistDate}
                                            onChange={e => setEditHistDate(e.target.value)}
                                            placeholder="YYYY-MM-DD"
                                            pattern="\d{4}-\d{2}-\d{2}"
                                            style={{ padding: '8px' }}
                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Cover</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={editHistCover}
                                                            onChange={e => setEditHistCover(e.target.value)}
                                                            style={{ padding: '8px' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Premium</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={editHistPremium}
                                                            onChange={e => setEditHistPremium(e.target.value)}
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

            {/* Mark Paid Confirmation Modal */}
            {markPaidPlan && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 200,
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        padding: '20px', boxSizing: 'border-box'
                    }}
                    onClick={cancelMarkPaid}
                >
                    <div
                        style={{
                            width: '100%', maxWidth: '400px',
                            backgroundColor: 'var(--bg-app)', padding: '24px', borderRadius: '12px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem' }}>Confirm Payment</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
                            Recording premium payment for <strong>{markPaidPlan.name}</strong>
                        </p>

                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Amount:</span>
                                <span style={{ fontWeight: '600', color: 'var(--accent-warning)' }}>{formatCurrency(markPaidPlan.premium_amount)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Frequency:</span>
                                <span style={{ fontWeight: '500' }}>{getFrequencyLabel(markPaidPlan.premium_frequency, markPaidPlan.custom_frequency_days)}</span>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Next Payment Due Date
                            </label>
                            <input
                                type="text"
                                value={markPaidNextDate}
                                onChange={e => setMarkPaidNextDate(e.target.value)}
                                placeholder="YYYY-MM-DD"
                                pattern="\d{4}-\d{2}-\d{2}"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'var(--input-bg)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    color: 'var(--text-primary)',
                                    fontSize: '1rem',
                                    boxSizing: 'border-box'
                                }}
                            />
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                                Auto-calculated based on {getFrequencyLabel(markPaidPlan.premium_frequency, markPaidPlan.custom_frequency_days).toLowerCase()} frequency. Adjust if needed.
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={cancelMarkPaid}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: 'transparent',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.9rem'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmMarkPaid}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: 'var(--accent-success)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '0.9rem'
                                }}
                            >
                                Confirm Payment
                            </button>
                        </div>
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
        </div>
    );
}
