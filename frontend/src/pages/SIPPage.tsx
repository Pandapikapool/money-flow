import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    fetchSIPs,
    createSIP,
    updateSIP,
    updateSIPNav,
    updateSIPTotalUnits,
    addSIPInstallment,
    pauseSIP,
    resumeSIP,
    redeemSIP,
    deleteSIP,
    type SIP
} from "../lib/api";
import { formatCurrency } from "../lib/format";

// Load custom page title from localStorage
function getPageTitle(): string {
    try {
        return localStorage.getItem('sip_page_title') || 'SIP / Mutual Funds';
    } catch {
        return 'SIP / Mutual Funds';
    }
}

function savePageTitle(title: string) {
    localStorage.setItem('sip_page_title', title);
}

// Load notes from localStorage
function getSIPNotes(): Record<string, string> {
    try {
        const saved = localStorage.getItem('sip_notes');
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
}

// Save notes to localStorage
function saveSIPNotes(notes: Record<string, string>) {
    localStorage.setItem('sip_notes', JSON.stringify(notes));
}

// Reflection prompts for SIP/Mutual Funds
const SIP_REFLECTION_PROMPTS = [
    "Am I diversified enough across fund categories?",
    "How did my funds perform compared to benchmarks?",
    "Should I increase my SIP amount this year?",
    "Are there underperforming funds I should switch?",
    "Did I panic-sell during market dips?",
    "What's my long-term goal for these investments?"
];

export default function SIPPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState<SIP[]>([]);
    const [loading, setLoading] = useState(true);

    // Page title editing
    const [pageTitle, setPageTitle] = useState(getPageTitle);
    const [editingTitle, setEditingTitle] = useState(false);
    const [titleValue, setTitleValue] = useState("");

    // NAV refresh state
    const [refreshingNav, setRefreshingNav] = useState<number | null>(null);
    const [lastNavUpdate, setLastNavUpdate] = useState<string | null>(null);

    // Inline NAV editing state
    const [editingNavId, setEditingNavId] = useState<number | null>(null);
    const [inlineNavValue, setInlineNavValue] = useState("");

    // Inline Units editing state
    const [editingUnitsId, setEditingUnitsId] = useState<number | null>(null);
    const [inlineUnitsValue, setInlineUnitsValue] = useState("");


    // Create State
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState("");
    const [newInvestmentType, setNewInvestmentType] = useState<'sip' | 'lumpsum'>('sip');
    const [newSipAmount, setNewSipAmount] = useState("");
    const [newInvestedAmount, setNewInvestedAmount] = useState("");
    const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [newNav, setNewNav] = useState("");
    const [newUnits, setNewUnits] = useState("");
    const [newNotes, setNewNotes] = useState("");

    // Fund Autocomplete State
    const [fundSuggestions, setFundSuggestions] = useState<Array<{ schemeCode: number; schemeName: string }>>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchingFunds, setSearchingFunds] = useState(false);
    const [selectedSchemeCode, setSelectedSchemeCode] = useState<number | null>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fundInputRef = useRef<HTMLInputElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

    // Edit Modal State
    const [editingItem, setEditingItem] = useState<SIP | null>(null);
    const [editName, setEditName] = useState("");
    const [editSipAmount, setEditSipAmount] = useState("");
    const [editUnits, setEditUnits] = useState("");
    const [editNav, setEditNav] = useState("");
    const [editNotes, setEditNotes] = useState("");
    const [editStartDate, setEditStartDate] = useState("");

    // Add Installment Modal State
    const [installmentSIP, setInstallmentSIP] = useState<SIP | null>(null);
    const [installmentAmount, setInstallmentAmount] = useState("");
    const [installmentNav, setInstallmentNav] = useState("");
    const [installmentDate, setInstallmentDate] = useState(new Date().toISOString().split('T')[0]);
    const [installmentType, setInstallmentType] = useState<'sip' | 'lumpsum'>('sip');

    // Redeem Modal State
    const [redeemingItem, setRedeemingItem] = useState<SIP | null>(null);
    const [redeemAmount, setRedeemAmount] = useState("");
    const [redeemDate, setRedeemDate] = useState(new Date().toISOString().split('T')[0]);

    // Delete Confirmation
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // Notes & Reflection state
    const [sipNotes, setSipNotes] = useState<Record<string, string>>(getSIPNotes);
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
            const data = await fetchSIPs();
            setItems(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Export to CSV
    const handleExportCSV = () => {
        if (items.length === 0) return;

        const headers = "Name,SIP Amount,Start Date,Total Units,Current NAV,Total Invested,Current Value,Returns %,Status,Notes\n";
        const rows = items.map(item =>
            `"${item.name}",${item.sip_amount},${item.start_date},${item.total_units.toFixed(4)},${item.current_nav.toFixed(4)},${item.total_invested},${item.current_value.toFixed(2)},${item.returns_percent.toFixed(2)},${item.status},"${(item.notes || '').replace(/"/g, '""')}"`
        ).join("\n");

        const csvContent = "data:text/csv;charset=utf-8," + headers + rows;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `sips_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Page title editing
    const startEditTitle = () => {
        setEditingTitle(true);
        setTitleValue(pageTitle);
    };

    const saveTitleEdit = () => {
        const newTitle = titleValue.trim() || 'SIP / Mutual Funds';
        setPageTitle(newTitle);
        savePageTitle(newTitle);
        setEditingTitle(false);
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') saveTitleEdit();
        else if (e.key === 'Escape') setEditingTitle(false);
    };

    // Fetch real-time NAV from external API
    // If schemeCode is provided, use it directly (most reliable)
    // Otherwise, search by fund name with improved matching
    const fetchRealTimeNav = async (fundName: string, schemeCode?: number | null): Promise<number | null> => {
        try {
            // If we have a scheme code, use it directly (most reliable method)
            if (schemeCode) {
                const navResponse = await fetch(`https://api.mfapi.in/mf/${schemeCode}/latest`);
                if (navResponse.ok) {
                    const navData = await navResponse.json();
                    if (navData && navData.data && navData.data.length > 0) {
                        return parseFloat(navData.data[0].nav);
                    }
                }
            }

            // Fallback: Search by fund name with improved matching
            // Extract key terms from fund name, handling IDCW/Growth variants
            let searchTerms = fundName
                .replace(/\s*-\s*/g, ' ') // Replace dashes with spaces
                .replace(/Income Distribution cum Capital Withdrawal Option/gi, 'IDCW')
                .replace(/\(IDCW\)/gi, 'IDCW')
                .toLowerCase();

            // Extract the AMC name and first meaningful word
            const words = searchTerms.split(/\s+/).filter(w => w.length > 2);
            // Try with first 2-3 meaningful words (usually AMC + fund type)
            const coreTerms = words.slice(0, 3).join(' ');

            // Search using core terms
            const response = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(coreTerms)}`);
            if (!response.ok) return null;

            const results = await response.json();
            if (!results || results.length === 0) return null;

            // Try to find best match by comparing with original fund name
            const fundNameLower = fundName.toLowerCase();
            let bestMatch = results[0];

            // Look for exact or close match
            for (const result of results) {
                const resultNameLower = result.schemeName.toLowerCase();
                // Exact match
                if (resultNameLower === fundNameLower) {
                    bestMatch = result;
                    break;
                }
                // Check if key parts match (AMC name + plan type)
                const fundWords = fundNameLower.split(/\s+/);
                const resultWords = resultNameLower.split(/\s+/);
                if (fundWords[0] === resultWords[0] && fundWords.length > 1 && resultWords.length > 1) {
                    // Same AMC, check for Direct/Regular and Growth/IDCW match
                    const hasDirectMatch = (fundNameLower.includes('direct') === resultNameLower.includes('direct'));
                    const hasRegularMatch = (fundNameLower.includes('regular') === resultNameLower.includes('regular'));
                    const hasGrowthMatch = (fundNameLower.includes('growth') === resultNameLower.includes('growth'));
                    const hasIdcwMatch = (fundNameLower.includes('idcw') === resultNameLower.includes('idcw'));

                    if ((hasDirectMatch || hasRegularMatch) && (hasGrowthMatch || hasIdcwMatch)) {
                        bestMatch = result;
                        break;
                    }
                }
            }

            // Fetch NAV for best match
            const navResponse = await fetch(`https://api.mfapi.in/mf/${bestMatch.schemeCode}/latest`);
            if (!navResponse.ok) return null;

            const navData = await navResponse.json();
            if (navData && navData.data && navData.data.length > 0) {
                return parseFloat(navData.data[0].nav);
            }
            return null;
        } catch (err) {
            console.error('Failed to fetch NAV:', err);
            return null;
        }
    };

    // Update dropdown position based on input element
    const updateDropdownPosition = () => {
        if (fundInputRef.current) {
            const rect = fundInputRef.current.getBoundingClientRect();
            // Use viewport coordinates for fixed positioning
            setDropdownPosition({
                top: rect.bottom,
                left: rect.left,
                width: rect.width
            });
        }
    };

    // Search funds from mfapi.in for autocomplete
    const searchFunds = async (query: string) => {
        if (!query || query.length < 2) {
            setFundSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        setSearchingFunds(true);
        try {
            // Search using each word separately for better matching
            const words = query.trim().split(/\s+/).filter(w => w.length >= 2);
            const searchQuery = words.length > 0 ? words[0] : query;

            const response = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(searchQuery)}`);
            if (!response.ok) {
                setFundSuggestions([]);
                return;
            }
            let results = await response.json();

            // If multiple words, filter results to match all words (case-insensitive)
            if (words.length > 1) {
                results = results.filter((fund: { schemeName: string }) => {
                    const nameLower = fund.schemeName.toLowerCase();
                    return words.every(word => nameLower.includes(word.toLowerCase()));
                });
            }

            // Show top 10 results for better selection
            setFundSuggestions(results.slice(0, 10));
            if (results.length > 0) {
                updateDropdownPosition();
                setShowSuggestions(true);
            } else {
                setShowSuggestions(false);
            }
        } catch (err) {
            console.error('Failed to search funds:', err);
            setFundSuggestions([]);
        } finally {
            setSearchingFunds(false);
        }
    };

    // Debounced fund name change handler
    const handleFundNameChange = (value: string) => {
        setNewName(value);
        setSelectedSchemeCode(null); // Clear selected scheme when typing

        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Debounce the search
        searchTimeoutRef.current = setTimeout(() => {
            searchFunds(value);
        }, 300);
    };

    // Select a fund from suggestions
    const selectFund = async (fund: { schemeCode: number; schemeName: string }) => {
        setNewName(fund.schemeName);
        setSelectedSchemeCode(fund.schemeCode);
        setShowSuggestions(false);
        setFundSuggestions([]);

        // Auto-fetch the current NAV for this fund
        try {
            const navResponse = await fetch(`https://api.mfapi.in/mf/${fund.schemeCode}/latest`);
            if (navResponse.ok) {
                const navData = await navResponse.json();
                if (navData && navData.data && navData.data.length > 0) {
                    setNewNav(navData.data[0].nav);
                }
            }
        } catch (err) {
            console.error('Failed to fetch NAV for selected fund:', err);
        }
    };

    const handleRefreshNav = async (item: SIP) => {
        setRefreshingNav(item.id);
        try {
            // Pass scheme_code if available for reliable lookup
            const newNav = await fetchRealTimeNav(item.name, item.scheme_code);
            if (newNav !== null) {
                await updateSIPNav(item.id, newNav);
                setLastNavUpdate(new Date().toLocaleTimeString());
                loadData();
            } else {
                alert(`Could not find NAV for "${item.name}".\n\nTip: Try searching for this fund again in "Add SIP" to link the correct scheme code, then update the existing entry.`);
            }
        } catch (err) {
            alert('Failed to update NAV');
        } finally {
            setRefreshingNav(null);
        }
    };

    const handleRefreshAllNav = async () => {
        const ongoing = items.filter(i => i.status === 'ongoing' || i.status === 'paused');
        let failedCount = 0;
        for (const item of ongoing) {
            setRefreshingNav(item.id);
            try {
                // Pass scheme_code if available for reliable lookup
                const newNav = await fetchRealTimeNav(item.name, item.scheme_code);
                if (newNav !== null) {
                    await updateSIPNav(item.id, newNav);
                } else {
                    failedCount++;
                    console.warn(`Could not find NAV for ${item.name}`);
                }
            } catch (err) {
                failedCount++;
                console.error(`Failed to refresh NAV for ${item.name}`);
            }
        }
        setRefreshingNav(null);
        setLastNavUpdate(new Date().toLocaleTimeString());
        loadData();
        if (failedCount > 0) {
            alert(`Updated ${ongoing.length - failedCount}/${ongoing.length} funds. ${failedCount} fund(s) need manual NAV update.`);
        }
    };

    // Inline NAV editing functions
    const startEditNav = (item: SIP) => {
        setEditingNavId(item.id);
        setInlineNavValue(item.current_nav.toFixed(4));
    };

    const saveInlineNav = async (itemId: number) => {
        const navValue = parseFloat(inlineNavValue);
        if (isNaN(navValue) || navValue <= 0) {
            setEditingNavId(null);
            return;
        }

        try {
            await updateSIPNav(itemId, navValue);
            setEditingNavId(null);
            setLastNavUpdate(new Date().toLocaleTimeString());
            loadData();
        } catch (err) {
            alert('Failed to update NAV');
        }
    };

    const handleInlineNavKeyDown = (e: React.KeyboardEvent, itemId: number) => {
        if (e.key === 'Enter') {
            saveInlineNav(itemId);
        } else if (e.key === 'Escape') {
            setEditingNavId(null);
        }
    };

    const startEditUnits = (item: SIP) => {
        setEditingUnitsId(item.id);
        setInlineUnitsValue(item.total_units.toFixed(4));
    };

    const saveInlineUnits = async (itemId: number) => {
        const unitsValue = parseFloat(inlineUnitsValue);
        if (isNaN(unitsValue) || unitsValue < 0) {
            setEditingUnitsId(null);
            return;
        }

        try {
            await updateSIPTotalUnits(itemId, unitsValue);
            setEditingUnitsId(null);
            loadData();
        } catch (err) {
            alert('Failed to update total units');
        }
    };

    const handleInlineUnitsKeyDown = (e: React.KeyboardEvent, itemId: number) => {
        if (e.key === 'Enter') {
            saveInlineUnits(itemId);
        } else if (e.key === 'Escape') {
            setEditingUnitsId(null);
        }
    };

    const ongoingItems = items.filter(i => i.status === 'ongoing' || i.status === 'paused').sort((a, b) => a.name.localeCompare(b.name));
    const redeemedItems = items.filter(i => i.status === 'redeemed').sort((a, b) =>
        new Date(b.redeemed_date || 0).getTime() - new Date(a.redeemed_date || 0).getTime()
    );

    const totalInvested = ongoingItems.reduce((sum, i) => sum + i.total_invested, 0);
    const totalCurrentValue = ongoingItems.reduce((sum, i) => sum + i.current_value, 0);
    const overallReturns = totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 : 0;

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate required fields with user feedback
        if (!newName.trim()) {
            alert("Please enter a fund name");
            return;
        }
        if (newInvestmentType === 'sip' && (!newSipAmount || parseFloat(newSipAmount) <= 0)) {
            alert("Please enter a valid SIP amount");
            return;
        }
        if (!newInvestedAmount || parseFloat(newInvestedAmount) <= 0) {
            alert("Please enter a valid invested amount");
            return;
        }
        if (!newStartDate) {
            alert("Please select a start date");
            return;
        }

        // NAV is optional - default to 1 if not provided (user can update later)
        const navValue = newNav && parseFloat(newNav) > 0 ? parseFloat(newNav) : 1;
        // Total units is optional - if not provided, will be calculated as invested_amount / nav
        const unitsValue = newUnits && parseFloat(newUnits) > 0 ? parseFloat(newUnits) : undefined;
        // SIP amount: use provided value for SIP, or 0 for lumpsum
        const sipAmountValue = newInvestmentType === 'sip' ? (parseFloat(newSipAmount) || 0) : 0;
        const investedAmountValue = parseFloat(newInvestedAmount);

        try {
            await createSIP(
                newName.trim(),
                sipAmountValue,
                newStartDate,
                navValue,
                newNotes || undefined,
                selectedSchemeCode || undefined,  // Pass scheme_code for reliable NAV lookups
                unitsValue,
                investedAmountValue,
                newInvestmentType
            );
            setNewName("");
            setNewInvestmentType('sip');
            setNewSipAmount("");
            setNewInvestedAmount("");
            setNewStartDate(new Date().toISOString().split('T')[0]);
            setNewNav("");
            setNewUnits("");
            setNewNotes("");
            setFundSuggestions([]);
            setShowSuggestions(false);
            setSelectedSchemeCode(null);
            setIsCreating(false);
            loadData();
        } catch (err) {
            alert("Failed to create SIP");
        }
    };

    const openEditModal = (item: SIP) => {
        setEditingItem(item);
        setEditName(item.name);
        setEditSipAmount(item.sip_amount.toString());
        setEditUnits(item.total_units.toFixed(4));
        setEditNav(item.current_nav.toString());
        setEditNotes(item.notes || "");
        setEditStartDate(item.start_date);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;

        try {
            // First update basic info (including start date)
            await updateSIP(
                editingItem.id,
                editName,
                parseFloat(editSipAmount),
                editNotes || undefined,
                editStartDate || undefined
            );

            // Update NAV if changed
            if (parseFloat(editNav) !== editingItem.current_nav) {
                await updateSIPNav(editingItem.id, parseFloat(editNav));
            }

            setEditingItem(null);
            loadData();
        } catch (err) {
            alert("Failed to update SIP");
        }
    };

    const openInstallmentModal = (item: SIP) => {
        setInstallmentSIP(item);
        setInstallmentAmount(item.sip_amount.toString());
        setInstallmentNav(item.current_nav.toString());
        setInstallmentDate(new Date().toISOString().split('T')[0]);
        setInstallmentType('sip');
    };

    const handleAddInstallment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!installmentSIP || !installmentAmount || !installmentNav || !installmentDate) return;

        try {
            await addSIPInstallment(
                installmentSIP.id,
                parseFloat(installmentAmount),
                parseFloat(installmentNav),
                installmentDate,
                installmentType
            );
            setInstallmentSIP(null);
            loadData();
        } catch (err) {
            alert("Failed to add installment");
        }
    };

    const handlePause = async (id: number) => {
        try {
            await pauseSIP(id);
            loadData();
        } catch (err) {
            alert("Failed to pause SIP");
        }
    };

    const handleResume = async (id: number) => {
        try {
            await resumeSIP(id);
            loadData();
        } catch (err) {
            alert("Failed to resume SIP");
        }
    };

    const openRedeemModal = (item: SIP) => {
        setRedeemingItem(item);
        setRedeemAmount(item.current_value.toFixed(2));
        setRedeemDate(new Date().toISOString().split('T')[0]);
    };

    const handleRedeem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!redeemingItem) return;

        try {
            await redeemSIP(
                redeemingItem.id,
                parseFloat(redeemAmount),
                redeemDate
            );
            setRedeemingItem(null);
            loadData();
        } catch (err) {
            alert("Failed to redeem SIP");
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteSIP(id);
            setDeletingId(null);
            loadData();
        } catch (err) {
            alert("Failed to delete SIP");
        }
    };

    const formatDateShort = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
    };

    // Notes/Reflection functions
    const startEditNote = (year: string) => {
        setEditingNoteYear(year);
        setNoteValue(sipNotes[year] || '');
    };

    const saveNote = () => {
        if (!editingNoteYear) return;
        const newNotes = { ...sipNotes };
        if (noteValue.trim()) {
            newNotes[editingNoteYear] = noteValue.trim();
        } else {
            delete newNotes[editingNoteYear];
        }
        setSipNotes(newNotes);
        saveSIPNotes(newNotes);
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

                    {/* Refresh All NAV Button */}
                    <button
                        onClick={handleRefreshAllNav}
                        disabled={ongoingItems.length === 0 || refreshingNav !== null}
                        style={{
                            padding: '6px 12px',
                            background: 'var(--accent-primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: ongoingItems.length === 0 || refreshingNav !== null ? 'not-allowed' : 'pointer',
                            fontSize: '0.8rem',
                            opacity: ongoingItems.length === 0 || refreshingNav !== null ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                        title="Fetch latest NAV from market (Indian MF)"
                    >
                        {refreshingNav !== null ? (
                            <>Updating...</>
                        ) : (
                            <>&#8635; Refresh NAV</>
                        )}
                    </button>
                    {lastNavUpdate && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            Last: {lastNavUpdate}
                        </span>
                    )}
                </div>
                {/* Portfolio Summary Cards - Groww-style */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'stretch' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
                        borderRadius: '12px',
                        padding: '16px 24px',
                        border: '1px solid rgba(59, 130, 246, 0.2)'
                    }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Invested</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--accent-primary)' }}>
                            {formatCurrency(totalInvested)}
                        </div>
                    </div>
                    <div style={{
                        background: overallReturns >= 0
                            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)'
                            : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)',
                        borderRadius: '12px',
                        padding: '16px 24px',
                        border: overallReturns >= 0 ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                    }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Current</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '700', color: overallReturns >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                            {formatCurrency(totalCurrentValue)}
                        </div>
                    </div>
                    <div style={{
                        background: overallReturns >= 0
                            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.08) 100%)'
                            : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.08) 100%)',
                        borderRadius: '12px',
                        padding: '16px 24px',
                        border: overallReturns >= 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
                    }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                            {overallReturns >= 0 ? 'Profit' : 'Loss'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <span style={{ fontSize: '1.4rem', fontWeight: '700', color: overallReturns >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                                {overallReturns >= 0 ? '+' : ''}{formatCurrency(totalCurrentValue - totalInvested)}
                            </span>
                            <span style={{
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                color: overallReturns >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
                                background: overallReturns >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                padding: '2px 6px',
                                borderRadius: '4px'
                            }}>
                                {overallReturns >= 0 ? '+' : ''}{overallReturns.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                    <div style={{
                        background: 'var(--bg-panel)',
                        borderRadius: '12px',
                        padding: '16px 24px',
                        border: '1px solid var(--border-color)'
                    }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Active SIPs</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '700' }}>
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
                            <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: '0.8rem', fontWeight: '600', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>FUND</th>
                            <th style={{ textAlign: 'center', padding: '14px 12px', fontSize: '0.8rem', fontWeight: '600', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>STARTED</th>
                            <th style={{ textAlign: 'right', padding: '14px 12px', fontSize: '0.8rem', fontWeight: '600', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>SIP</th>
                            <th style={{ textAlign: 'right', padding: '14px 12px', fontSize: '0.8rem', fontWeight: '600', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>UNITS</th>
                            <th style={{ textAlign: 'right', padding: '14px 12px', fontSize: '0.8rem', fontWeight: '600', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>NAV</th>
                            <th style={{ textAlign: 'right', padding: '14px 12px', fontSize: '0.8rem', fontWeight: '600', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>INVESTED</th>
                            <th style={{ textAlign: 'right', padding: '14px 12px', fontSize: '0.8rem', fontWeight: '600', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>CURRENT</th>
                            <th style={{ textAlign: 'right', padding: '14px 12px', fontSize: '0.8rem', fontWeight: '600', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>RETURNS</th>
                            <th style={{ width: '260px', padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Ongoing Items */}
                        {ongoingItems.map(item => (
                            <tr key={item.id} style={item.status === 'paused' ? { background: 'rgba(245, 158, 11, 0.05)' } : {}}>
                                <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}>
                                    <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {item.name}
                                        {item.status === 'paused' && (
                                            <span style={{
                                                fontSize: '0.65rem',
                                                padding: '2px 5px',
                                                background: 'rgba(245, 158, 11, 0.2)',
                                                color: 'rgb(180, 120, 20)',
                                                borderRadius: '3px',
                                                fontWeight: '600'
                                            }}>
                                                PAUSED
                                            </span>
                                        )}
                                    </div>
                                    {item.notes && (
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {item.notes}
                                        </div>
                                    )}
                                </td>
                                <td style={{ padding: '14px 12px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                                    {formatDateShort(item.start_date)}
                                </td>
                                <td style={{ padding: '14px 12px', textAlign: 'right', fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)' }}>
                                    {formatCurrency(item.sip_amount)}
                                </td>
                                <td style={{ padding: '14px 12px', textAlign: 'right', fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)' }}>
                                    {editingUnitsId === item.id ? (
                                        <input
                                            type="number"
                                            step="0.0001"
                                            value={inlineUnitsValue}
                                            onChange={e => setInlineUnitsValue(e.target.value)}
                                            onBlur={() => saveInlineUnits(item.id)}
                                            onKeyDown={e => handleInlineUnitsKeyDown(e, item.id)}
                                            autoFocus
                                            style={{
                                                width: '90px',
                                                padding: '4px 6px',
                                                fontSize: '0.85rem',
                                                textAlign: 'right',
                                                fontFamily: 'monospace',
                                                border: '1px solid var(--accent-primary)',
                                                borderRadius: '4px',
                                                background: 'var(--bg-app)'
                                            }}
                                        />
                                    ) : (
                                        <span
                                            onClick={() => startEditUnits(item)}
                                            style={{
                                                cursor: 'pointer',
                                                padding: '2px 4px',
                                                borderRadius: '4px',
                                                transition: 'background 0.15s',
                                                fontFamily: 'monospace',
                                                display: 'inline-block'
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                            title="Click to edit total units"
                                        >
                                            {item.total_units.toFixed(3)}
                                        </span>
                                    )}
                                </td>
                                <td style={{ padding: '14px 12px', textAlign: 'right', fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)' }}>
                                    {editingNavId === item.id ? (
                                        <input
                                            type="number"
                                            step="0.0001"
                                            value={inlineNavValue}
                                            onChange={e => setInlineNavValue(e.target.value)}
                                            onBlur={() => saveInlineNav(item.id)}
                                            onKeyDown={e => handleInlineNavKeyDown(e, item.id)}
                                            autoFocus
                                            style={{
                                                width: '80px',
                                                padding: '4px 6px',
                                                fontSize: '0.85rem',
                                                textAlign: 'right',
                                                border: '1px solid var(--accent-primary)',
                                                borderRadius: '4px',
                                                background: 'var(--bg-app)'
                                            }}
                                        />
                                    ) : (
                                        <span
                                            onClick={() => startEditNav(item)}
                                            style={{
                                                cursor: 'pointer',
                                                padding: '2px 4px',
                                                borderRadius: '4px',
                                                transition: 'background 0.15s'
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                            title="Click to edit NAV"
                                        >
                                            {item.current_nav.toFixed(2)}
                                        </span>
                                    )}
                                </td>
                                <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '600', color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-color)' }}>
                                    {formatCurrency(item.total_invested)}
                                </td>
                                <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '600', color: item.returns_percent >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', borderBottom: '1px solid var(--border-color)' }}>
                                    {formatCurrency(item.current_value)}
                                </td>
                                <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>
                                    <span style={{
                                        color: item.returns_percent >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
                                        background: item.returns_percent >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        padding: '3px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.85rem'
                                    }}>
                                        {item.returns_percent >= 0 ? '+' : ''}{item.returns_percent.toFixed(1)}%
                                    </span>
                                </td>
                                <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={() => handleRefreshNav(item)}
                                            disabled={refreshingNav === item.id}
                                            style={{
                                                padding: '5px 8px',
                                                background: item.scheme_code ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                                                border: item.scheme_code ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
                                                borderRadius: '4px',
                                                cursor: refreshingNav === item.id ? 'wait' : 'pointer',
                                                fontSize: '0.7rem',
                                                color: item.scheme_code ? 'var(--accent-success)' : 'var(--text-primary)',
                                                opacity: refreshingNav === item.id ? 0.5 : 1
                                            }}
                                            title={item.scheme_code ? 'Refresh NAV (linked to mfapi.in)' : 'Refresh NAV (search by name)'}
                                        >
                                            {refreshingNav === item.id ? '...' : '↻'}
                                        </button>
                                        <button
                                            onClick={() => openInstallmentModal(item)}
                                            style={{ padding: '5px 8px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}
                                            title="Add SIP/Lumpsum"
                                        >
                                            +
                                        </button>
                                        {item.status === 'ongoing' ? (
                                            <button
                                                onClick={() => handlePause(item.id)}
                                                style={{ padding: '5px 8px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.65rem', color: 'var(--text-primary)' }}
                                                title="Pause SIP"
                                            >
                                                ||
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleResume(item.id)}
                                                style={{ padding: '5px 8px', background: 'var(--accent-success)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.65rem' }}
                                                title="Resume SIP"
                                            >
                                                &#9654;
                                            </button>
                                        )}
                                        <button
                                            onClick={() => openEditModal(item)}
                                            style={{ padding: '5px 8px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', color: 'var(--text-primary)' }}
                                            title="Edit"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => openRedeemModal(item)}
                                            style={{
                                                padding: '5px 10px',
                                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '0.7rem',
                                                fontWeight: '500'
                                            }}
                                            title="Withdraw / Redeem"
                                        >
                                            Withdraw
                                        </button>
                                        {deletingId === item.id ? (
                                            <>
                                                <button onClick={() => handleDelete(item.id)} style={{ padding: '5px 8px', background: 'var(--accent-danger)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>Yes</button>
                                                <button onClick={() => setDeletingId(null)} style={{ padding: '5px 8px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', color: 'var(--text-primary)' }}>No</button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => setDeletingId(item.id)}
                                                style={{ padding: '5px 8px', background: 'transparent', border: '1px solid var(--accent-danger)', color: 'var(--accent-danger)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}
                                                title="Delete"
                                            >
                                                X
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {/* Separator */}
                        {ongoingItems.length > 0 && redeemedItems.length > 0 && (
                            <tr>
                                <td colSpan={9} style={{ padding: '12px 16px', background: 'var(--bg-panel)', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Redeemed
                                </td>
                            </tr>
                        )}

                        {/* Redeemed Items */}
                        {redeemedItems.map(item => (
                            <tr key={item.id} style={{ opacity: 0.6 }}>
                                <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}>
                                    <div style={{ fontWeight: '500' }}>{item.name}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                        Redeemed {item.redeemed_date ? formatDateShort(item.redeemed_date) : '-'}
                                    </div>
                                </td>
                                <td style={{ padding: '14px 12px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                                    {formatDateShort(item.start_date)}
                                </td>
                                <td style={{ padding: '14px 12px', textAlign: 'right', fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)' }}>
                                    {formatCurrency(item.sip_amount)}
                                </td>
                                <td style={{ padding: '14px 12px', textAlign: 'right', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                    -
                                </td>
                                <td style={{ padding: '14px 12px', textAlign: 'right', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                    -
                                </td>
                                <td style={{ padding: '14px 12px', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>
                                    {formatCurrency(item.total_invested)}
                                </td>
                                <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>
                                    {formatCurrency(item.redeemed_amount || 0)}
                                </td>
                                <td style={{ padding: '14px 12px', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>
                                    {item.total_invested > 0 ? (
                                        <span style={{
                                            color: ((item.redeemed_amount || 0) - item.total_invested) >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
                                            background: ((item.redeemed_amount || 0) - item.total_invested) >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            padding: '3px 8px',
                                            borderRadius: '4px',
                                            fontSize: '0.85rem'
                                        }}>
                                            {((item.redeemed_amount || 0) - item.total_invested) >= 0 ? '+' : ''}
                                            {(((item.redeemed_amount || 0) - item.total_invested) / item.total_invested * 100).toFixed(1)}%
                                        </span>
                                    ) : '-'}
                                </td>
                                <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}>
                                    {deletingId === item.id ? (
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                            <button onClick={() => handleDelete(item.id)} style={{ padding: '5px 8px', background: 'var(--accent-danger)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>Yes</button>
                                            <button onClick={() => setDeletingId(null)} style={{ padding: '5px 8px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', color: 'var(--text-primary)' }}>No</button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => setDeletingId(item.id)}
                                                style={{ padding: '5px 8px', background: 'transparent', border: '1px solid var(--accent-danger)', color: 'var(--accent-danger)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}
                                            >
                                                X
                                            </button>
                                        </div>
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
                            padding: '14px 16px',
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
                        <span style={{ fontSize: '1.2rem' }}>+</span> Add SIP / Mutual Fund
                    </div>
                ) : (
                    <form onSubmit={handleCreate} style={{ padding: '16px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-panel)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 100px 100px 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
                            <div style={{ position: 'relative' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                    Fund Name {searchingFunds && <span style={{ marginLeft: '8px', fontSize: '0.65rem' }}>searching...</span>}
                                    {selectedSchemeCode && <span style={{ marginLeft: '8px', fontSize: '0.65rem', color: 'var(--accent-success)' }}>matched</span>}
                                </label>
                                <input
                                    ref={fundInputRef}
                                    type="text"
                                    value={newName}
                                    onChange={e => handleFundNameChange(e.target.value)}
                                    onFocus={() => {
                                        if (fundSuggestions.length > 0) {
                                            updateDropdownPosition();
                                            setShowSuggestions(true);
                                        }
                                    }}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    placeholder="Search or type fund name..."
                                    autoFocus
                                    autoComplete="off"
                                />
                                {/* Autocomplete Suggestions Dropdown - Groww-style */}
                                {showSuggestions && fundSuggestions.length > 0 && dropdownPosition && (
                                    <div style={{
                                        position: 'fixed',
                                        top: dropdownPosition.top + 4,
                                        left: dropdownPosition.left,
                                        width: Math.max(dropdownPosition.width, 400),
                                        zIndex: 9999,
                                        maxHeight: '350px',
                                        overflowY: 'auto',
                                        background: 'var(--bg-app)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '12px',
                                        boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                                    }}>
                                        <div style={{ padding: '10px 14px', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-color)' }}>
                                            {fundSuggestions.length} funds found
                                        </div>
                                        {fundSuggestions.map((fund, idx) => (
                                            <div
                                                key={fund.schemeCode}
                                                style={{
                                                    padding: '14px 16px',
                                                    fontSize: '0.9rem',
                                                    cursor: 'pointer',
                                                    borderBottom: idx < fundSuggestions.length - 1 ? '1px solid var(--border-color)' : 'none',
                                                    transition: 'background 0.15s',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px'
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    selectFund(fund);
                                                }}
                                            >
                                                <div style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '8px',
                                                    background: 'linear-gradient(135deg, var(--accent-primary) 0%, #1d4ed8 100%)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#fff',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '600',
                                                    flexShrink: 0
                                                }}>
                                                    {fund.schemeName.split(' ').slice(0, 2).map(w => w[0]).join('')}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {fund.schemeName}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <div style={{ padding: '12px 16px', fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-panel)', borderTop: '1px solid var(--border-color)', borderRadius: '0 0 12px 12px' }}>
                                            Don't see your fund? Just type the name and press Add
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Type</label>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '8px', background: 'var(--input-bg)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
                                        <input 
                                            type="radio" 
                                            checked={newInvestmentType === 'sip'} 
                                            onChange={() => setNewInvestmentType('sip')}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        SIP
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
                                        <input 
                                            type="radio" 
                                            checked={newInvestmentType === 'lumpsum'} 
                                            onChange={() => setNewInvestmentType('lumpsum')}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        Lumpsum
                                    </label>
                                </div>
                            </div>
                            {newInvestmentType === 'sip' && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>SIP Amount</label>
                                    <input type="number" value={newSipAmount} onChange={e => setNewSipAmount(e.target.value)} placeholder="5000" />
                                </div>
                            )}
                            {newInvestmentType === 'lumpsum' && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>SIP Amount</label>
                                    <input type="number" value="0" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
                                </div>
                            )}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Invested Amount</label>
                                <input type="number" value={newInvestedAmount} onChange={e => setNewInvestedAmount(e.target.value)} placeholder="5000" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Start Date</label>
                                <input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Current NAV <span style={{ opacity: 0.6 }}>(optional)</span></label>
                                <input type="number" step="0.01" value={newNav} onChange={e => setNewNav(e.target.value)} placeholder="Auto or 1" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Units <span style={{ opacity: 0.6 }}>(optional)</span></label>
                                <input type="number" step="0.0001" value={newUnits} onChange={e => setNewUnits(e.target.value)} placeholder="Auto calc" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Notes</label>
                                <input type="text" value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Optional" />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button type="button" onClick={() => { setIsCreating(false); setNewName(""); setNewInvestmentType('sip'); setNewSipAmount(""); setNewInvestedAmount(""); setNewStartDate(new Date().toISOString().split('T')[0]); setNewNav(""); setNewUnits(""); setNewNotes(""); setFundSuggestions([]); setShowSuggestions(false); setSelectedSchemeCode(null); }} style={{ padding: '8px 12px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
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
                                {SIP_REFLECTION_PROMPTS.map((prompt, idx) => (
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
                                                {sipNotes[year] ? 'Edit' : 'Add Notes'}
                                            </button>
                                        )}
                                    </div>

                                    {editingNoteYear === year ? (
                                        <div>
                                            <textarea
                                                value={noteValue}
                                                onChange={e => setNoteValue(e.target.value)}
                                                onKeyDown={handleNoteKeyDown}
                                                placeholder="Write your SIP/MF reflections for this year..."
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
                                            color: sipNotes[year] ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            lineHeight: '1.6',
                                            whiteSpace: 'pre-wrap',
                                            minHeight: '60px'
                                        }}>
                                            {sipNotes[year] || 'No notes yet. Click "Add Notes" to write your reflections.'}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingItem && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
                        display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}
                    onClick={() => setEditingItem(null)}
                >
                    <div
                        style={{
                            backgroundColor: 'var(--bg-app)', padding: '28px', borderRadius: '12px',
                            minWidth: '450px', maxWidth: '550px'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 style={{ margin: '0 0 24px' }}>Edit Fund</h3>
                        <form onSubmit={handleUpdate}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Fund Name</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    style={{ width: '100%' }}
                                    autoFocus
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>SIP Amount</label>
                                    <input
                                        type="number"
                                        value={editSipAmount}
                                        onChange={e => setEditSipAmount(e.target.value)}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Current NAV</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editNav}
                                        onChange={e => setEditNav(e.target.value)}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Total Units</label>
                                    <input
                                        type="number"
                                        step="0.0001"
                                        value={editUnits}
                                        disabled
                                        style={{ width: '100%', opacity: 0.6, cursor: 'not-allowed' }}
                                    />
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                        Units are calculated from installments
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Start Date</label>
                                    <input
                                        type="date"
                                        value={editStartDate}
                                        onChange={e => setEditStartDate(e.target.value)}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>
                            <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg-panel)', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Invested:</span>
                                    <span style={{ fontWeight: '600' }}>{formatCurrency(editingItem.total_invested)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Current Value:</span>
                                    <span style={{ fontWeight: '600', color: editingItem.returns_percent >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                                        {formatCurrency(parseFloat(editUnits) * parseFloat(editNav) || editingItem.current_value)}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Returns:</span>
                                    <span style={{ fontWeight: '600', color: editingItem.returns_percent >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                                        {editingItem.returns_percent >= 0 ? '+' : ''}{editingItem.returns_percent.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Notes</label>
                                <textarea
                                    value={editNotes}
                                    onChange={e => setEditNotes(e.target.value)}
                                    placeholder="Optional notes..."
                                    rows={3}
                                    style={{ width: '100%', resize: 'vertical' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setEditingItem(null)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
                                <button type="submit" style={{ padding: '10px 24px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Installment Modal */}
            {installmentSIP && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
                        display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}
                    onClick={() => setInstallmentSIP(null)}
                >
                    <div
                        style={{
                            backgroundColor: 'var(--bg-app)', padding: '28px', borderRadius: '12px',
                            minWidth: '400px', maxWidth: '500px'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 style={{ margin: '0 0 20px' }}>Add Installment - {installmentSIP.name}</h3>
                        <form onSubmit={handleAddInstallment}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px' }}>Type</label>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                        <input type="radio" checked={installmentType === 'sip'} onChange={() => setInstallmentType('sip')} />
                                        Regular SIP
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                        <input type="radio" checked={installmentType === 'lumpsum'} onChange={() => setInstallmentType('lumpsum')} />
                                        Lumpsum
                                    </label>
                                </div>
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px' }}>Amount</label>
                                <input
                                    type="number"
                                    value={installmentAmount}
                                    onChange={e => setInstallmentAmount(e.target.value)}
                                    style={{ width: '100%' }}
                                    autoFocus
                                />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px' }}>NAV at Purchase</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={installmentNav}
                                    onChange={e => setInstallmentNav(e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px' }}>Date</label>
                                <input
                                    type="date"
                                    value={installmentDate}
                                    onChange={e => setInstallmentDate(e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            {installmentAmount && installmentNav && parseFloat(installmentNav) > 0 && (
                                <div style={{ marginBottom: '20px', padding: '12px', background: 'var(--bg-panel)', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Units to be added:</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                                        {(parseFloat(installmentAmount) / parseFloat(installmentNav)).toFixed(4)}
                                    </div>
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setInstallmentSIP(null)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
                                <button type="submit" style={{ padding: '10px 24px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Add Installment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Redeem Modal */}
            {redeemingItem && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
                        display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}
                    onClick={() => setRedeemingItem(null)}
                >
                    <div
                        style={{
                            backgroundColor: 'var(--bg-app)', padding: '28px', borderRadius: '12px',
                            minWidth: '400px', maxWidth: '500px'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 style={{ margin: '0 0 20px' }}>Redeem "{redeemingItem.name}"</h3>
                        <form onSubmit={handleRedeem}>
                            <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg-panel)', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Total Invested:</span>
                                    <span style={{ fontWeight: '600' }}>{formatCurrency(redeemingItem.total_invested)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Current Value:</span>
                                    <span style={{ fontWeight: '600', color: 'var(--accent-success)' }}>{formatCurrency(redeemingItem.current_value)}</span>
                                </div>
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px' }}>Redemption Amount</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={redeemAmount}
                                    onChange={e => setRedeemAmount(e.target.value)}
                                    style={{ width: '100%', fontSize: '1.25rem', fontWeight: '600' }}
                                    autoFocus
                                />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px' }}>Redemption Date</label>
                                <input
                                    type="date"
                                    value={redeemDate}
                                    onChange={e => setRedeemDate(e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setRedeemingItem(null)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
                                <button type="submit" style={{ padding: '10px 24px', background: 'var(--accent-danger)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Redeem</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
