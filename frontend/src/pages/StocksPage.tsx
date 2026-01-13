import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
    fetchStocks, createStock, updateStock,
    updateStockPrice, sellStock, deleteStock
} from "../lib/api";
import type { Stock, StockMarket } from "../lib/api";
import { formatCurrency } from "../lib/format";

// Market configuration
const MARKET_CONFIG: Record<StockMarket, {
    title: string;
    symbolLabel: string;
    symbolPlaceholder: string;
    priceLabel: string;
    searchApi?: string;
}> = {
    indian: {
        title: 'Indian Stocks',
        symbolLabel: 'NSE/BSE Symbol',
        symbolPlaceholder: 'RELIANCE, TCS, INFY...',
        priceLabel: 'Price (INR)'
    },
    us: {
        title: 'US Stocks',
        symbolLabel: 'Ticker Symbol',
        symbolPlaceholder: 'AAPL, GOOGL, MSFT...',
        priceLabel: 'Price (USD)'
    },
    crypto: {
        title: 'Cryptocurrency',
        symbolLabel: 'Symbol',
        symbolPlaceholder: 'BTC, ETH, SOL...',
        priceLabel: 'Price (USD)',
        searchApi: 'https://api.coingecko.com/api/v3'
    }
};

// Reflection prompts
const REFLECTION_PROMPTS: Record<StockMarket, string[]> = {
    indian: [
        "Am I diversified across sectors?",
        "Should I rebalance my portfolio?",
        "Are my holdings aligned with my risk tolerance?",
        "Did I follow my investment thesis for each stock?"
    ],
    us: [
        "How is currency fluctuation affecting my returns?",
        "Am I overexposed to any sector?",
        "Should I increase my US allocation?",
        "Are there tax implications I need to consider?"
    ],
    crypto: [
        "Am I investing more than I can afford to lose?",
        "Is my portfolio too concentrated in one coin?",
        "Have I secured my holdings properly?",
        "Should I take some profits off the table?"
    ]
};

// Helper to fetch crypto price from CoinGecko
async function fetchCryptoPrice(symbol: string): Promise<number | null> {
    try {
        // Map common symbols to CoinGecko IDs
        const symbolMap: Record<string, string> = {
            'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana',
            'XRP': 'ripple', 'ADA': 'cardano', 'DOGE': 'dogecoin',
            'DOT': 'polkadot', 'MATIC': 'matic-network', 'LINK': 'chainlink',
            'AVAX': 'avalanche-2', 'UNI': 'uniswap', 'ATOM': 'cosmos',
            'LTC': 'litecoin', 'BCH': 'bitcoin-cash', 'NEAR': 'near',
            'APT': 'aptos', 'OP': 'optimism', 'ARB': 'arbitrum'
        };

        const coinId = symbolMap[symbol.toUpperCase()] || symbol.toLowerCase();
        const response = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
        );

        if (!response.ok) return null;
        const data = await response.json();
        return data[coinId]?.usd || null;
    } catch {
        return null;
    }
}

// Helper to search crypto coins
async function searchCrypto(query: string): Promise<Array<{ id: string; symbol: string; name: string }>> {
    try {
        const response = await fetch(
            `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`
        );
        if (!response.ok) return [];
        const data = await response.json();
        return data.coins?.slice(0, 10) || [];
    } catch {
        return [];
    }
}

// Notes localStorage helpers
function getStocksNotes(market: StockMarket): Record<string, string> {
    try {
        const saved = localStorage.getItem(`stocks_${market}_notes`);
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
}

function saveStocksNotes(market: StockMarket, notes: Record<string, string>) {
    localStorage.setItem(`stocks_${market}_notes`, JSON.stringify(notes));
}

export default function StocksPage() {
    const navigate = useNavigate();
    const { market } = useParams<{ market: string }>();
    const [searchParams] = useSearchParams();
    const tileId = searchParams.get('custom') || undefined;

    // Validate market
    const validMarket = ['indian', 'us', 'crypto'].includes(market || '')
        ? market as StockMarket
        : 'indian';

    const config = MARKET_CONFIG[validMarket];

    // Get custom tile name from localStorage if this is a custom tile
    const customTileName = tileId ? (() => {
        try {
            const tiles = JSON.parse(localStorage.getItem('investment_custom_tiles') || '[]');
            const tile = tiles.find((t: { id: string }) => t.id === tileId);
            return tile?.name;
        } catch { return null; }
    })() : null;

    const [items, setItems] = useState<Stock[]>([]);
    const [loading, setLoading] = useState(true);

    // Create form state
    const [isCreating, setIsCreating] = useState(false);
    const [newSymbol, setNewSymbol] = useState("");
    const [newName, setNewName] = useState("");
    const [newQuantity, setNewQuantity] = useState("");
    const [newInvestedValue, setNewInvestedValue] = useState("");
    const [newCurrentValue, setNewCurrentValue] = useState("");

    // Crypto search state
    const [cryptoSuggestions, setCryptoSuggestions] = useState<Array<{ id: string; symbol: string; name: string }>>([]);
    const [showCryptoSuggestions, setShowCryptoSuggestions] = useState(false);

    // Edit state
    const [editingItem, setEditingItem] = useState<Stock | null>(null);
    const [editSymbol, setEditSymbol] = useState("");
    const [editName, setEditName] = useState("");
    const [editQuantity, setEditQuantity] = useState("");
    const [editInvestedValue, setEditInvestedValue] = useState("");
    const [editCurrentValue, setEditCurrentValue] = useState("");

    // Sell modal state
    const [sellingItem, setSellingItem] = useState<Stock | null>(null);
    const [sellPrice, setSellPrice] = useState("");
    const [sellDate, setSellDate] = useState(new Date().toISOString().split('T')[0]);

    // Inline price edit state
    const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
    const [inlinePriceValue, setInlinePriceValue] = useState("");

    // Delete confirmation
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // Notes state
    const [stocksNotes, setStocksNotes] = useState<Record<string, string>>(getStocksNotes(validMarket));
    const [notesExpanded, setNotesExpanded] = useState(false);
    const [editingNoteYear, setEditingNoteYear] = useState<string | null>(null);
    const [noteValue, setNoteValue] = useState("");
    const currentYear = new Date().getFullYear().toString();

    // Price refresh state
    const [refreshingPrice, setRefreshingPrice] = useState<number | null>(null);
    const [lastPriceUpdate, setLastPriceUpdate] = useState<string | null>(null);

    useEffect(() => {
        loadData();
        setStocksNotes(getStocksNotes(validMarket));
    }, [validMarket, tileId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchStocks(validMarket, tileId);
            setItems(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Crypto symbol search
    useEffect(() => {
        if (validMarket !== 'crypto' || newSymbol.length < 2) {
            setCryptoSuggestions([]);
            return;
        }

        const timer = setTimeout(async () => {
            const results = await searchCrypto(newSymbol);
            setCryptoSuggestions(results);
            setShowCryptoSuggestions(results.length > 0);
        }, 300);

        return () => clearTimeout(timer);
    }, [newSymbol, validMarket]);

    const selectCryptoSuggestion = async (coin: { id: string; symbol: string; name: string }) => {
        setNewSymbol(coin.symbol.toUpperCase());
        setNewName(coin.name);
        setShowCryptoSuggestions(false);
        setCryptoSuggestions([]);
    };

    // Refresh price for crypto
    const refreshPrice = async (item: Stock) => {
        if (validMarket !== 'crypto') return;

        setRefreshingPrice(item.id);
        try {
            const price = await fetchCryptoPrice(item.symbol);
            if (price) {
                await updateStockPrice(item.id, price);
                setLastPriceUpdate(new Date().toLocaleTimeString());
                loadData();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setRefreshingPrice(null);
        }
    };

    // Refresh all prices
    const refreshAllPrices = async () => {
        if (validMarket !== 'crypto') return;

        const holdingItems = items.filter(i => i.status === 'holding');
        for (const item of holdingItems) {
            await refreshPrice(item);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newSymbol.trim()) {
            alert("Please enter a symbol");
            return;
        }
        if (!newName.trim()) {
            alert("Please enter a name");
            return;
        }
        if (!newQuantity || parseFloat(newQuantity) <= 0) {
            alert("Please enter a valid quantity");
            return;
        }
        if (!newInvestedValue || parseFloat(newInvestedValue) <= 0) {
            alert("Please enter a valid invested value");
            return;
        }
        if (!newCurrentValue || parseFloat(newCurrentValue) <= 0) {
            alert("Please enter a valid current value");
            return;
        }

        try {
            // Calculate current_price from current_value and quantity
            const currentPriceValue = parseFloat(newCurrentValue) / parseFloat(newQuantity);
            // Use today's date as buy_date
            const buyDate = new Date().toISOString().split('T')[0];
            
            await createStock(
                validMarket,
                newSymbol.trim(),
                newName.trim(),
                parseFloat(newQuantity),
                parseFloat(newInvestedValue),
                buyDate,
                currentPriceValue,
                undefined, // No notes
                tileId // Pass tile_id for custom tiles
            );
            resetCreateForm();
            loadData();
        } catch (err) {
            alert("Failed to create entry");
        }
    };

    const resetCreateForm = () => {
        setIsCreating(false);
        setNewSymbol("");
        setNewName("");
        setNewQuantity("");
        setNewInvestedValue("");
        setNewCurrentValue("");
        setCryptoSuggestions([]);
        setShowCryptoSuggestions(false);
    };

    const openEditModal = (item: Stock) => {
        setEditingItem(item);
        setEditSymbol(item.symbol);
        setEditName(item.name);
        setEditQuantity(item.quantity.toString());
        setEditInvestedValue(item.invested_value.toString());
        setEditCurrentValue(item.current_value.toString());
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;

        try {
            // Calculate current_price from current_value and quantity
            const currentPriceValue = parseFloat(editCurrentValue) / parseFloat(editQuantity);
            
            await updateStock(
                editingItem.id,
                editSymbol,
                editName,
                parseFloat(editQuantity),
                parseFloat(editInvestedValue),
                editingItem.buy_date, // Keep existing buy_date
                undefined, // No notes
                currentPriceValue
            );
            setEditingItem(null);
            loadData();
        } catch (err) {
            alert("Failed to update");
        }
    };

    const startEditPrice = (item: Stock) => {
        setEditingPriceId(item.id);
        setInlinePriceValue(item.current_price.toString());
    };

    const saveInlinePrice = async (itemId: number) => {
        const priceValue = parseFloat(inlinePriceValue);
        if (isNaN(priceValue) || priceValue <= 0) {
            setEditingPriceId(null);
            return;
        }
        try {
            await updateStockPrice(itemId, priceValue);
            setEditingPriceId(null);
            setLastPriceUpdate(new Date().toLocaleTimeString());
            loadData();
        } catch (err) {
            alert('Failed to update price');
        }
    };

    const handleInlinePriceKeyDown = (e: React.KeyboardEvent, itemId: number) => {
        if (e.key === 'Enter') {
            saveInlinePrice(itemId);
        } else if (e.key === 'Escape') {
            setEditingPriceId(null);
        }
    };

    const openSellModal = (item: Stock) => {
        setSellingItem(item);
        setSellPrice(item.current_price.toString());
        setSellDate(new Date().toISOString().split('T')[0]);
    };

    const handleSell = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sellingItem) return;

        try {
            await sellStock(sellingItem.id, parseFloat(sellPrice), sellDate);
            setSellingItem(null);
            loadData();
        } catch (err) {
            alert("Failed to sell");
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteStock(id);
            setDeletingId(null);
            loadData();
        } catch (err) {
            alert("Failed to delete");
        }
    };

    // Notes functions
    const startEditNote = (year: string) => {
        setEditingNoteYear(year);
        setNoteValue(stocksNotes[year] || '');
    };

    const saveNote = () => {
        if (!editingNoteYear) return;
        const newNotes = { ...stocksNotes };
        if (noteValue.trim()) {
            newNotes[editingNoteYear] = noteValue.trim();
        } else {
            delete newNotes[editingNoteYear];
        }
        setStocksNotes(newNotes);
        saveStocksNotes(validMarket, newNotes);
        setEditingNoteYear(null);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatPrice = (price: number) => {
        if (validMarket === 'crypto') {
            return price < 1 ? `$${price.toFixed(6)}` : `$${price.toFixed(2)}`;
        }
        return validMarket === 'us' ? `$${price.toFixed(2)}` : formatCurrency(price);
    };

    const formatValue = (value: number) => {
        return validMarket === 'us' || validMarket === 'crypto'
            ? `$${value.toFixed(2)}`
            : formatCurrency(value);
    };

    // Separate holding and sold items
    const holdingItems = items.filter(i => i.status === 'holding');
    const soldItems = items.filter(i => i.status === 'sold');

    // Calculate totals
    const totalInvested = holdingItems.reduce((sum, i) => sum + i.invested_value, 0);
    const totalCurrentValue = holdingItems.reduce((sum, i) => sum + i.current_value, 0);
    const totalProfitLoss = totalCurrentValue - totalInvested;
    const overallReturns = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

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
                            padding: '8px 12px',
                            background: 'transparent',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: 'var(--text-primary)'
                        }}
                    >
                        &larr; Back
                    </button>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: '600', margin: 0 }}>
                        {customTileName || config.title}
                        {customTileName && <span style={{ fontSize: '0.85rem', fontWeight: '400', color: 'var(--text-secondary)', marginLeft: '12px' }}>({config.title})</span>}
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                    {validMarket === 'crypto' && holdingItems.length > 0 && (
                        <button
                            onClick={refreshAllPrices}
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
                            Refresh All Prices
                        </button>
                    )}
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Invested</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-primary)' }}>
                            {formatValue(totalInvested)}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Current Value</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: totalProfitLoss >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                            {formatValue(totalCurrentValue)}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>P&L</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: totalProfitLoss >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                            {totalProfitLoss >= 0 ? '+' : ''}{formatValue(totalProfitLoss)} ({overallReturns.toFixed(2)}%)
                        </div>
                    </div>
                </div>
            </div>

            {lastPriceUpdate && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Last price update: {lastPriceUpdate}
                </div>
            )}

            {/* Holding Items */}
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>
                        Current Holdings ({holdingItems.length})
                    </h2>
                    <button
                        onClick={() => setIsCreating(!isCreating)}
                        style={{
                            padding: '8px 16px',
                            background: isCreating ? 'transparent' : 'var(--accent-primary)',
                            color: isCreating ? 'var(--text-primary)' : '#fff',
                            border: isCreating ? '1px solid var(--border-color)' : 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        {isCreating ? 'Cancel' : '+ Add'}
                    </button>
                </div>

                {/* Create Form */}
                {isCreating && (
                    <form onSubmit={handleCreate} style={{ marginBottom: '24px', padding: '20px', background: 'var(--bg-panel)', borderRadius: '8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                            <div style={{ position: 'relative' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{config.symbolLabel}</label>
                                <input
                                    type="text"
                                    value={newSymbol}
                                    onChange={e => setNewSymbol(e.target.value.toUpperCase())}
                                    onFocus={() => validMarket === 'crypto' && cryptoSuggestions.length > 0 && setShowCryptoSuggestions(true)}
                                    placeholder={config.symbolPlaceholder}
                                    autoFocus
                                />
                                {/* Crypto suggestions dropdown */}
                                {validMarket === 'crypto' && showCryptoSuggestions && cryptoSuggestions.length > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        background: 'var(--bg-app)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '6px',
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        zIndex: 10
                                    }}>
                                        {cryptoSuggestions.map(coin => (
                                            <div
                                                key={coin.id}
                                                onClick={() => selectCryptoSuggestion(coin)}
                                                style={{
                                                    padding: '10px 12px',
                                                    cursor: 'pointer',
                                                    borderBottom: '1px solid var(--border-color)'
                                                }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-panel)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                            >
                                                <div style={{ fontWeight: '600' }}>{coin.symbol.toUpperCase()}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{coin.name}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Name</label>
                                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Units</label>
                                <input type="number" step="any" value={newQuantity} onChange={e => setNewQuantity(e.target.value)} placeholder="10" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Invested Value</label>
                                <input type="number" step="any" value={newInvestedValue} onChange={e => setNewInvestedValue(e.target.value)} placeholder="10000.00" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Current Value</label>
                                <input type="number" step="any" value={newCurrentValue} onChange={e => setNewCurrentValue(e.target.value)} placeholder="12000.00" />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" onClick={resetCreateForm} style={{ padding: '8px 12px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
                            <button type="submit" style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Add</button>
                        </div>
                    </form>
                )}

                {/* Holdings Table */}
                {holdingItems.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>
                        No holdings yet. Click "+ Add" to add your first {validMarket === 'crypto' ? 'crypto' : 'stock'}.
                    </p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Symbol</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Name</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Qty</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Buy Price</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Current Price</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Invested</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Current Value</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>P&L</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {holdingItems.map(item => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '12px 8px', fontWeight: '600' }}>{item.symbol}</td>
                                        <td style={{ padding: '12px 8px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.name}>{item.name}</td>
                                        <td style={{ padding: '12px 8px', textAlign: 'right' }}>{item.quantity.toLocaleString()}</td>
                                        <td style={{ padding: '12px 8px', textAlign: 'right' }}>{formatPrice(item.buy_price)}</td>
                                        <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                                            {editingPriceId === item.id ? (
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={inlinePriceValue}
                                                    onChange={e => setInlinePriceValue(e.target.value)}
                                                    onBlur={() => saveInlinePrice(item.id)}
                                                    onKeyDown={e => handleInlinePriceKeyDown(e, item.id)}
                                                    autoFocus
                                                    style={{ width: '100px', textAlign: 'right' }}
                                                />
                                            ) : (
                                                <span
                                                    onClick={() => startEditPrice(item)}
                                                    style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}
                                                    title="Click to edit price"
                                                >
                                                    {formatPrice(item.current_price)}
                                                </span>
                                            )}
                                            {validMarket === 'crypto' && (
                                                <button
                                                    onClick={() => refreshPrice(item)}
                                                    disabled={refreshingPrice === item.id}
                                                    style={{
                                                        marginLeft: '6px',
                                                        padding: '2px 6px',
                                                        background: 'transparent',
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: '4px',
                                                        cursor: refreshingPrice === item.id ? 'wait' : 'pointer',
                                                        fontSize: '0.7rem'
                                                    }}
                                                >
                                                    {refreshingPrice === item.id ? '...' : '↻'}
                                                </button>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px 8px', textAlign: 'right' }}>{formatValue(item.invested_value)}</td>
                                        <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600' }}>{formatValue(item.current_value)}</td>
                                        <td style={{ padding: '12px 8px', textAlign: 'right', color: item.profit_loss >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', fontWeight: '600' }}>
                                            {item.profit_loss >= 0 ? '+' : ''}{formatValue(item.profit_loss)}
                                            <span style={{ fontSize: '0.8rem', marginLeft: '4px' }}>
                                                ({item.profit_loss_percent.toFixed(2)}%)
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                <button onClick={() => openEditModal(item)} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-primary)' }}>Edit</button>
                                                <button onClick={() => openSellModal(item)} style={{ padding: '4px 8px', background: 'var(--accent-success)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Sell</button>
                                                {deletingId === item.id ? (
                                                    <>
                                                        <button onClick={() => handleDelete(item.id)} style={{ padding: '4px 8px', background: 'var(--accent-danger)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Yes</button>
                                                        <button onClick={() => setDeletingId(null)} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-primary)' }}>No</button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => setDeletingId(item.id)} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid var(--accent-danger)', color: 'var(--accent-danger)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Del</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Sold Items (History) */}
            {soldItems.length > 0 && (
                <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', opacity: 0.85 }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '16px' }}>
                        Sold / Closed ({soldItems.length})
                    </h2>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Symbol</th>
                                    <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Name</th>
                                    <th style={{ padding: '10px 8px', textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Qty</th>
                                    <th style={{ padding: '10px 8px', textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Buy Price</th>
                                    <th style={{ padding: '10px 8px', textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Sell Price</th>
                                    <th style={{ padding: '10px 8px', textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>P&L</th>
                                    <th style={{ padding: '10px 8px', textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Sell Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {soldItems.map(item => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '10px 8px' }}>{item.symbol}</td>
                                        <td style={{ padding: '10px 8px' }}>{item.name}</td>
                                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>{item.quantity.toLocaleString()}</td>
                                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>{formatPrice(item.buy_price)}</td>
                                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>{item.sell_price ? formatPrice(item.sell_price) : '-'}</td>
                                        <td style={{ padding: '10px 8px', textAlign: 'right', color: item.profit_loss >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                                            {item.profit_loss >= 0 ? '+' : ''}{formatValue(item.profit_loss)} ({item.profit_loss_percent.toFixed(2)}%)
                                        </td>
                                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>{item.sell_date ? formatDate(item.sell_date) : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
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
                                {REFLECTION_PROMPTS[validMarket].map((prompt, idx) => (
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
                                                {stocksNotes[year] ? 'Edit' : 'Add Notes'}
                                            </button>
                                        )}
                                    </div>

                                    {editingNoteYear === year ? (
                                        <div>
                                            <textarea
                                                value={noteValue}
                                                onChange={e => setNoteValue(e.target.value)}
                                                placeholder={`Write your ${config.title} reflections for this year...`}
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
                                            color: stocksNotes[year] ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            lineHeight: '1.6',
                                            whiteSpace: 'pre-wrap',
                                            minHeight: '60px'
                                        }}>
                                            {stocksNotes[year] || 'No notes yet. Click "Add Notes" to write your reflections.'}
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
                            minWidth: '450px', maxWidth: '600px'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 style={{ margin: '0 0 20px' }}>Edit {editingItem.symbol}</h3>
                        <form onSubmit={handleUpdate}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Symbol</label>
                                    <input type="text" value={editSymbol} onChange={e => setEditSymbol(e.target.value.toUpperCase())} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Name</label>
                                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Units</label>
                                    <input type="number" step="any" value={editQuantity} onChange={e => setEditQuantity(e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Invested Value</label>
                                    <input type="number" step="any" value={editInvestedValue} onChange={e => setEditInvestedValue(e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Current Value</label>
                                    <input type="number" step="any" value={editCurrentValue} onChange={e => setEditCurrentValue(e.target.value)} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setEditingItem(null)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
                                <button type="submit" style={{ padding: '10px 24px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sell Modal */}
            {sellingItem && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
                        display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}
                    onClick={() => setSellingItem(null)}
                >
                    <div
                        style={{
                            backgroundColor: 'var(--bg-app)', padding: '28px', borderRadius: '12px',
                            minWidth: '400px'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 style={{ margin: '0 0 20px' }}>Sell {sellingItem.symbol}</h3>
                        <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg-panel)', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Quantity</span>
                                <span style={{ fontWeight: '600' }}>{sellingItem.quantity}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Buy Price</span>
                                <span>{formatPrice(sellingItem.buy_price)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Invested</span>
                                <span style={{ fontWeight: '600' }}>{formatValue(sellingItem.invested_value)}</span>
                            </div>
                        </div>
                        <form onSubmit={handleSell}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Sell Price (per unit)</label>
                                <input type="number" step="any" value={sellPrice} onChange={e => setSellPrice(e.target.value)} style={{ width: '100%' }} />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Sell Date</label>
                                <input type="date" value={sellDate} onChange={e => setSellDate(e.target.value)} style={{ width: '100%' }} />
                            </div>
                            {sellPrice && (
                                <div style={{ marginBottom: '20px', padding: '12px', background: 'var(--bg-panel)', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Sale Value</span>
                                        <span style={{ fontWeight: '600' }}>{formatValue(sellingItem.quantity * parseFloat(sellPrice))}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>P&L</span>
                                        <span style={{
                                            fontWeight: '600',
                                            color: (sellingItem.quantity * parseFloat(sellPrice) - sellingItem.invested_value) >= 0
                                                ? 'var(--accent-success)'
                                                : 'var(--accent-danger)'
                                        }}>
                                            {(sellingItem.quantity * parseFloat(sellPrice) - sellingItem.invested_value) >= 0 ? '+' : ''}
                                            {formatValue(sellingItem.quantity * parseFloat(sellPrice) - sellingItem.invested_value)}
                                        </span>
                                    </div>
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setSellingItem(null)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
                                <button type="submit" style={{ padding: '10px 24px', background: 'var(--accent-success)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Confirm Sell</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
