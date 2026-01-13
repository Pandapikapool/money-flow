import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchFixedReturnsSummary, fetchSIPSummary, fetchRDSummary, fetchStocksSummary } from "../lib/api";
import type { StockMarket } from "../lib/api";
import { formatCurrency } from "../lib/format";

interface InvestmentCategory {
    id: string;
    name: string;
    path: string;
    ongoingCount: number;
    totalInvested: number;
    totalExpected: number;
    loading: boolean;
    isMarketLinked?: boolean;
    isUSD?: boolean; // For US/Crypto - values in USD
    templateType: string; // Base template type for creating new tiles
}

// Template types that can be used to create new tiles
const TEMPLATE_TYPES = [
    { id: 'fixed', name: 'Fixed Returns', description: 'FDs, Bonds with guaranteed returns' },
    { id: 'sip', name: 'SIP / Mutual Funds', description: 'Market-linked mutual funds' },
    { id: 'rd', name: 'Recurring Deposits', description: 'Periodic deposits with interest' },
    { id: 'indian', name: 'Indian Stocks', description: 'NSE/BSE stock holdings' },
    { id: 'us', name: 'US Stocks', description: 'NASDAQ/NYSE stock holdings' },
    { id: 'crypto', name: 'Cryptocurrency', description: 'Crypto assets with API lookup' }
];

const DEFAULT_NAMES: Record<string, string> = {
    fixed: 'Fixed Returns',
    sip: 'SIP / Mutual Funds',
    rd: 'Recurring Deposits',
    indian: 'Indian Stocks',
    us: 'US Stocks',
    crypto: 'Cryptocurrency'
};

// Load custom titles from localStorage
function getCustomTitles(): Record<string, string> {
    try {
        const saved = localStorage.getItem('investment_tile_titles');
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
}

// Save custom titles to localStorage
function saveCustomTitles(titles: Record<string, string>) {
    localStorage.setItem('investment_tile_titles', JSON.stringify(titles));
}

// Load custom tiles from localStorage
function getCustomTiles(): Array<{ id: string; name: string; templateType: string }> {
    try {
        const saved = localStorage.getItem('investment_custom_tiles');
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

// Save custom tiles to localStorage
function saveCustomTiles(tiles: Array<{ id: string; name: string; templateType: string }>) {
    localStorage.setItem('investment_custom_tiles', JSON.stringify(tiles));
}

export default function InvestmentsPage() {
    const navigate = useNavigate();

    const [customTitles, setCustomTitles] = useState<Record<string, string>>(getCustomTitles);
    const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
    const [editTitleValue, setEditTitleValue] = useState("");

    // Custom tiles state
    const [customTiles, setCustomTiles] = useState(getCustomTiles);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [newTileName, setNewTileName] = useState("");
    const [selectedTemplate, setSelectedTemplate] = useState("");

    const [categories, setCategories] = useState<InvestmentCategory[]>([
        {
            id: 'fixed',
            name: customTitles['fixed'] || DEFAULT_NAMES['fixed'],
            path: '/investments/fixed',
            ongoingCount: 0,
            totalInvested: 0,
            totalExpected: 0,
            loading: true,
            templateType: 'fixed'
        },
        {
            id: 'sip',
            name: customTitles['sip'] || DEFAULT_NAMES['sip'],
            path: '/investments/sip',
            ongoingCount: 0,
            totalInvested: 0,
            totalExpected: 0,
            loading: true,
            isMarketLinked: true,
            templateType: 'sip'
        },
        {
            id: 'rd',
            name: customTitles['rd'] || DEFAULT_NAMES['rd'],
            path: '/investments/rd',
            ongoingCount: 0,
            totalInvested: 0,
            totalExpected: 0,
            loading: true,
            templateType: 'rd'
        },
        {
            id: 'indian',
            name: customTitles['indian'] || DEFAULT_NAMES['indian'],
            path: '/investments/stocks/indian',
            ongoingCount: 0,
            totalInvested: 0,
            totalExpected: 0,
            loading: true,
            isMarketLinked: true,
            templateType: 'indian'
        },
        {
            id: 'us',
            name: customTitles['us'] || DEFAULT_NAMES['us'],
            path: '/investments/stocks/us',
            ongoingCount: 0,
            totalInvested: 0,
            totalExpected: 0,
            loading: true,
            isMarketLinked: true,
            isUSD: true,
            templateType: 'us'
        },
        {
            id: 'crypto',
            name: customTitles['crypto'] || DEFAULT_NAMES['crypto'],
            path: '/investments/stocks/crypto',
            ongoingCount: 0,
            totalInvested: 0,
            totalExpected: 0,
            loading: true,
            isMarketLinked: true,
            isUSD: true,
            templateType: 'crypto'
        }
    ]);

    useEffect(() => {
        loadSummaries();
    }, []);

    // Update category names when customTitles change
    useEffect(() => {
        setCategories(prev => prev.map(cat => ({
            ...cat,
            name: customTitles[cat.id] || DEFAULT_NAMES[cat.id] || cat.name
        })));
    }, [customTitles]);

    const loadSummaries = async () => {
        // Load Fixed Returns summary
        try {
            const fixedSummary = await fetchFixedReturnsSummary();
            setCategories(prev => prev.map(cat =>
                cat.id === 'fixed' ? {
                    ...cat,
                    ongoingCount: fixedSummary.ongoing_count,
                    totalInvested: fixedSummary.total_invested,
                    totalExpected: fixedSummary.total_expected,
                    loading: false
                } : cat
            ));
        } catch (err) {
            console.error(err);
            setCategories(prev => prev.map(cat =>
                cat.id === 'fixed' ? { ...cat, loading: false } : cat
            ));
        }

        // Load SIP summary
        try {
            const sipSummary = await fetchSIPSummary();
            setCategories(prev => prev.map(cat =>
                cat.id === 'sip' ? {
                    ...cat,
                    ongoingCount: sipSummary.ongoing_count,
                    totalInvested: sipSummary.total_invested,
                    totalExpected: sipSummary.current_value,
                    loading: false
                } : cat
            ));
        } catch (err) {
            console.error(err);
            setCategories(prev => prev.map(cat =>
                cat.id === 'sip' ? { ...cat, loading: false } : cat
            ));
        }

        // Load RD summary
        try {
            const rdSummary = await fetchRDSummary();
            setCategories(prev => prev.map(cat =>
                cat.id === 'rd' ? {
                    ...cat,
                    ongoingCount: rdSummary.ongoing_count,
                    totalInvested: rdSummary.total_invested,
                    totalExpected: rdSummary.total_maturity,
                    loading: false
                } : cat
            ));
        } catch (err) {
            console.error(err);
            setCategories(prev => prev.map(cat =>
                cat.id === 'rd' ? { ...cat, loading: false } : cat
            ));
        }

        // Load Stocks summaries (Indian, US, Crypto)
        const stockMarkets: StockMarket[] = ['indian', 'us', 'crypto'];
        for (const market of stockMarkets) {
            try {
                const summary = await fetchStocksSummary(market);
                setCategories(prev => prev.map(cat =>
                    cat.id === market ? {
                        ...cat,
                        ongoingCount: summary.holding_count,
                        totalInvested: summary.total_invested,
                        totalExpected: summary.current_value,
                        loading: false
                    } : cat
                ));
            } catch (err) {
                console.error(err);
                setCategories(prev => prev.map(cat =>
                    cat.id === market ? { ...cat, loading: false } : cat
                ));
            }
        }
    };

    const startEditTitle = (categoryId: string, currentName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingTitleId(categoryId);
        setEditTitleValue(currentName);
    };

    const saveTitle = () => {
        if (!editingTitleId) return;

        const newTitles = { ...customTitles };
        if (editTitleValue.trim() && editTitleValue.trim() !== DEFAULT_NAMES[editingTitleId]) {
            newTitles[editingTitleId] = editTitleValue.trim();
        } else {
            delete newTitles[editingTitleId];
        }

        setCustomTitles(newTitles);
        saveCustomTitles(newTitles);
        setEditingTitleId(null);
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            saveTitle();
        } else if (e.key === 'Escape') {
            setEditingTitleId(null);
        }
    };

    // Create new tile from template
    const handleCreateTile = () => {
        if (!newTileName.trim() || !selectedTemplate) {
            alert("Please enter a name and select a template");
            return;
        }

        const newTile = {
            id: `custom_${Date.now()}`,
            name: newTileName.trim(),
            templateType: selectedTemplate
        };

        const updatedTiles = [...customTiles, newTile];
        setCustomTiles(updatedTiles);
        saveCustomTiles(updatedTiles);

        setShowTemplateModal(false);
        setNewTileName("");
        setSelectedTemplate("");
    };

    // Delete custom tile
    const handleDeleteTile = (tileId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Delete this tile?")) return;

        const updatedTiles = customTiles.filter(t => t.id !== tileId);
        setCustomTiles(updatedTiles);
        saveCustomTiles(updatedTiles);
    };

    // Get path for custom tile based on template type
    const getCustomTilePath = (tile: { id: string; templateType: string }) => {
        const templatePaths: Record<string, string> = {
            fixed: '/investments/fixed',
            sip: '/investments/sip',
            rd: '/investments/rd',
            indian: '/investments/stocks/indian',
            us: '/investments/stocks/us',
            crypto: '/investments/stocks/crypto'
        };
        return `${templatePaths[tile.templateType]}?custom=${tile.id}`;
    };

    // Format value based on category (USD for US stocks/crypto)
    const formatValue = (categoryId: string, value: number) => {
        const cat = categories.find(c => c.id === categoryId);
        if (cat?.isUSD) {
            return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return formatCurrency(value);
    };

    // Calculate totals - separate INR and USD
    const inrCategories = categories.filter(c => !c.isUSD);
    const usdCategories = categories.filter(c => c.isUSD);

    // INR totals
    const totalInvestedINR = inrCategories.reduce((sum, cat) => sum + cat.totalInvested, 0);

    // Expected maturity from fixed interest investments (fixed, rd) - total maturity value
    const fixedReturnsCat = categories.find(c => c.id === 'fixed');
    const rdCat = categories.find(c => c.id === 'rd');
    const expectedMaturity = (fixedReturnsCat?.totalExpected || 0) + (rdCat?.totalExpected || 0);
    const fixedInvested = (fixedReturnsCat?.totalInvested || 0) + (rdCat?.totalInvested || 0);

    // Market value from market-linked INR investments (sip, indian stocks)
    const marketLinkedINR = inrCategories.filter(c => c.isMarketLinked);
    const marketLinkedINRInvested = marketLinkedINR.reduce((sum, cat) => sum + cat.totalInvested, 0);
    const currentMarketValueINR = marketLinkedINR.reduce((sum, cat) => sum + cat.totalExpected, 0);

    // USD totals (US Stocks + Crypto)
    const totalInvestedUSD = usdCategories.reduce((sum, cat) => sum + cat.totalInvested, 0);
    const currentValueUSD = usdCategories.reduce((sum, cat) => sum + cat.totalExpected, 0);

    return (
        <div style={{ maxWidth: '1200px' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: '600', margin: 0 }}>Investments</h1>
                    <button
                        onClick={() => setShowTemplateModal(true)}
                        style={{
                            padding: '8px 16px',
                            background: 'var(--accent-primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                        }}
                    >
                        + Add Template
                    </button>
                </div>

                {/* Summary Stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Row 1: INR Stats */}
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <div className="glass-panel" style={{ padding: '14px 20px', flex: '1', minWidth: '180px' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                Total Invested (INR)
                            </div>
                            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--accent-primary)' }}>
                                {formatCurrency(totalInvestedINR)}
                            </div>
                        </div>
                        <div className="glass-panel" style={{ padding: '14px 20px', flex: '1', minWidth: '180px' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                Expected Maturity
                            </div>
                            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--accent-success)' }}>
                                {formatCurrency(expectedMaturity)}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                Fixed + RD {fixedInvested > 0 && <span style={{ color: 'var(--accent-success)' }}>(+{formatCurrency(expectedMaturity - fixedInvested)})</span>}
                            </div>
                        </div>
                        <div className="glass-panel" style={{ padding: '14px 20px', flex: '1', minWidth: '180px' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                Market Value (INR)
                            </div>
                            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: currentMarketValueINR >= marketLinkedINRInvested ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                                {formatCurrency(currentMarketValueINR)}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                SIP + Indian Stocks {marketLinkedINRInvested > 0 && (
                                    <span style={{ color: currentMarketValueINR >= marketLinkedINRInvested ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                                        ({currentMarketValueINR >= marketLinkedINRInvested ? '+' : ''}{((currentMarketValueINR - marketLinkedINRInvested) / marketLinkedINRInvested * 100).toFixed(1)}%)
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Row 2: USD Stats */}
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <div className="glass-panel" style={{ padding: '14px 20px', flex: '1', minWidth: '200px', borderLeft: '3px solid #4CAF50' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                USD Invested
                            </div>
                            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--accent-primary)' }}>
                                ${totalInvestedUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>US Stocks + Crypto</div>
                        </div>
                        <div className="glass-panel" style={{ padding: '14px 20px', flex: '1', minWidth: '200px', borderLeft: '3px solid #4CAF50' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                USD Market Value
                            </div>
                            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: currentValueUSD >= totalInvestedUSD ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                                ${currentValueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            {totalInvestedUSD > 0 && (
                                <div style={{ fontSize: '0.7rem', color: currentValueUSD >= totalInvestedUSD ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                                    P&L: {currentValueUSD >= totalInvestedUSD ? '+' : ''}{((currentValueUSD - totalInvestedUSD) / totalInvestedUSD * 100).toFixed(2)}% (${(currentValueUSD - totalInvestedUSD).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {categories.map(category => (
                    <div
                        key={category.id}
                        className="glass-panel"
                        style={{
                            padding: '24px',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'transform 0.15s, box-shadow 0.15s'
                        }}
                        onClick={() => navigate(category.path)}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                        {/* Drill-through indicator */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: 0,
                            height: 0,
                            borderStyle: 'solid',
                            borderWidth: '0 40px 40px 0',
                            borderColor: `transparent ${category.isUSD ? '#4CAF50' : 'var(--accent-success)'} transparent transparent`
                        }} />
                        <div style={{
                            position: 'absolute',
                            top: '8px',
                            right: '6px',
                            color: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                        }}>
                            {category.isUSD ? '$' : '→'}
                        </div>

                        {/* Editable Title */}
                        {editingTitleId === category.id ? (
                            <input
                                type="text"
                                value={editTitleValue}
                                onChange={e => setEditTitleValue(e.target.value)}
                                onBlur={saveTitle}
                                onKeyDown={handleTitleKeyDown}
                                onClick={e => e.stopPropagation()}
                                autoFocus
                                style={{
                                    fontSize: '1.1rem',
                                    fontWeight: '600',
                                    marginBottom: '16px',
                                    padding: '4px 8px',
                                    border: '1px solid var(--accent-primary)',
                                    borderRadius: '4px',
                                    background: 'var(--bg-app)',
                                    width: 'calc(100% - 50px)'
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    fontSize: '1.1rem',
                                    fontWeight: '600',
                                    marginBottom: '16px',
                                    cursor: 'text',
                                    paddingRight: '40px'
                                }}
                                onDoubleClick={e => startEditTitle(category.id, category.name, e)}
                                title="Double-click to edit title"
                            >
                                {category.name}
                            </div>
                        )}

                        {category.loading ? (
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading...</div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        {category.isMarketLinked ? 'Holdings' : 'Ongoing'}
                                    </span>
                                    <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>{category.ongoingCount}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Invested</span>
                                    <span style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>
                                        {formatValue(category.id, category.totalInvested)}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        {category.isMarketLinked ? 'Current' : 'Maturity'}
                                    </span>
                                    <span style={{
                                        fontWeight: '600',
                                        color: category.isMarketLinked
                                            ? (category.totalExpected >= category.totalInvested ? 'var(--accent-success)' : 'var(--accent-danger)')
                                            : 'var(--accent-success)'
                                    }}>
                                        {formatValue(category.id, category.totalExpected)}
                                    </span>
                                </div>
                                {/* P&L indicator for market-linked investments */}
                                {category.isMarketLinked && category.totalInvested > 0 && (
                                    <div style={{
                                        marginTop: '8px',
                                        fontSize: '0.8rem',
                                        color: category.totalExpected >= category.totalInvested ? 'var(--accent-success)' : 'var(--accent-danger)'
                                    }}>
                                        P&L: {category.totalExpected >= category.totalInvested ? '+' : ''}
                                        {((category.totalExpected - category.totalInvested) / category.totalInvested * 100).toFixed(2)}%
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ))}

                {/* Custom Tiles */}
                {customTiles.map(tile => {
                    const templateInfo = TEMPLATE_TYPES.find(t => t.id === tile.templateType);
                    const isUSD = tile.templateType === 'us' || tile.templateType === 'crypto';
                    return (
                        <div
                            key={tile.id}
                            className="glass-panel"
                            style={{
                                padding: '24px',
                                cursor: 'pointer',
                                position: 'relative',
                                transition: 'transform 0.15s, box-shadow 0.15s',
                                border: '1px dashed var(--border-color)'
                            }}
                            onClick={() => navigate(getCustomTilePath(tile))}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            {/* Delete button */}
                            <button
                                onClick={(e) => handleDeleteTile(tile.id, e)}
                                style={{
                                    position: 'absolute',
                                    top: '8px',
                                    right: '8px',
                                    padding: '2px 6px',
                                    background: 'var(--accent-danger)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.7rem'
                                }}
                            >
                                ×
                            </button>

                            <div style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '8px', paddingRight: '30px' }}>
                                {tile.name}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                                Template: {templateInfo?.name}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Click to open {isUSD ? '(USD)' : '(INR)'}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Template Modal */}
            {showTemplateModal && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
                        display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}
                    onClick={() => setShowTemplateModal(false)}
                >
                    <div
                        style={{
                            backgroundColor: 'var(--bg-app)', padding: '28px', borderRadius: '12px',
                            minWidth: '450px', maxWidth: '550px'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 style={{ margin: '0 0 20px' }}>Create New Investment Tile</h3>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                Tile Name
                            </label>
                            <input
                                type="text"
                                value={newTileName}
                                onChange={e => setNewTileName(e.target.value)}
                                placeholder="e.g., Emergency Fund FD, Retirement Portfolio"
                                style={{ width: '100%' }}
                                autoFocus
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '10px', color: 'var(--text-secondary)' }}>
                                Select Template Type
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {TEMPLATE_TYPES.map(template => (
                                    <div
                                        key={template.id}
                                        onClick={() => setSelectedTemplate(template.id)}
                                        style={{
                                            padding: '12px',
                                            border: `2px solid ${selectedTemplate === template.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            background: selectedTemplate === template.id ? 'var(--bg-panel)' : 'transparent'
                                        }}
                                    >
                                        <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '4px' }}>
                                            {template.name}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {template.description}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => { setShowTemplateModal(false); setNewTileName(""); setSelectedTemplate(""); }}
                                style={{
                                    padding: '10px 20px',
                                    background: 'transparent',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateTile}
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
                                Create Tile
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
