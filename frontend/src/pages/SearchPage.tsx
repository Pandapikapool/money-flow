import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { searchExpenses, fetchTags, type ExpenseSearchResult, type Tag } from '../lib/api';
import { formatCurrency } from '../lib/format';

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
    let timer: ReturnType<typeof setTimeout>;
    return ((...args: any[]) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    }) as T;
}

export default function SearchPage() {
    const [q, setQ] = useState('');
    const [tagId, setTagId] = useState<number | ''>('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [min, setMin] = useState('');
    const [max, setMax] = useState('');

    const [results, setResults] = useState<ExpenseSearchResult[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchTags()
            .then(setTags)
            .catch(() => {});
        inputRef.current?.focus();
    }, []);

    const runSearch = useCallback(
        async (params: {
            q: string;
            tagId: number | '';
            from: string;
            to: string;
            min: string;
            max: string;
        }) => {
            if (
                !params.q &&
                !params.tagId &&
                !params.from &&
                !params.to &&
                !params.min &&
                !params.max
            ) {
                setResults([]);
                setSearched(false);
                return;
            }
            setLoading(true);
            setSearched(true);
            try {
                const data = await searchExpenses({
                    q: params.q || undefined,
                    tag_id: params.tagId || undefined,
                    from: params.from || undefined,
                    to: params.to || undefined,
                    min: params.min ? parseFloat(params.min) : undefined,
                    max: params.max ? parseFloat(params.max) : undefined,
                });
                setResults(data);
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        },
        []
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSearch = useCallback(debounce(runSearch, 300), [runSearch]);

    useEffect(() => {
        debouncedSearch({ q, tagId, from, to, min, max });
    }, [q, tagId, from, to, min, max, debouncedSearch]);

    const totalAmount = results.reduce((s, r) => s + Number(r.amount), 0);

    const monthLink = (dateStr: string) => {
        const d = new Date(dateStr);
        return `/expenses/${d.getFullYear()}/${d.getMonth() + 1}`;
    };

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '8px' }}>Search Expenses</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
                Full-text search across all your expenses
            </p>

            {/* Search inputs */}
            <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
                {/* Main query */}
                <div style={{ marginBottom: '16px' }}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder='Search by description… e.g. "Swiggy", "Zomato", "petrol"'
                        style={{ fontSize: '1.05rem' }}
                    />
                </div>

                {/* Filter row */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                        gap: '12px',
                    }}
                >
                    <div>
                        <label
                            style={{
                                display: 'block',
                                fontSize: '0.78rem',
                                color: 'var(--text-secondary)',
                                marginBottom: '4px',
                            }}
                        >
                            Category
                        </label>
                        <select
                            value={tagId}
                            onChange={(e) => setTagId(e.target.value ? Number(e.target.value) : '')}
                            style={{ width: '100%' }}
                        >
                            <option value="">Any</option>
                            {tags.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label
                            style={{
                                display: 'block',
                                fontSize: '0.78rem',
                                color: 'var(--text-secondary)',
                                marginBottom: '4px',
                            }}
                        >
                            From date
                        </label>
                        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                    </div>
                    <div>
                        <label
                            style={{
                                display: 'block',
                                fontSize: '0.78rem',
                                color: 'var(--text-secondary)',
                                marginBottom: '4px',
                            }}
                        >
                            To date
                        </label>
                        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                    </div>
                    <div>
                        <label
                            style={{
                                display: 'block',
                                fontSize: '0.78rem',
                                color: 'var(--text-secondary)',
                                marginBottom: '4px',
                            }}
                        >
                            Min ₹
                        </label>
                        <input
                            type="number"
                            value={min}
                            onChange={(e) => setMin(e.target.value)}
                            placeholder="0"
                            min={0}
                        />
                    </div>
                    <div>
                        <label
                            style={{
                                display: 'block',
                                fontSize: '0.78rem',
                                color: 'var(--text-secondary)',
                                marginBottom: '4px',
                            }}
                        >
                            Max ₹
                        </label>
                        <input
                            type="number"
                            value={max}
                            onChange={(e) => setMax(e.target.value)}
                            placeholder="∞"
                            min={0}
                        />
                    </div>
                </div>
            </div>

            {/* Results */}
            {loading && (
                <div
                    style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px' }}
                >
                    Searching…
                </div>
            )}

            {!loading && searched && (
                <>
                    {/* Summary bar */}
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '12px',
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)',
                        }}
                    >
                        <span>
                            {results.length} result{results.length !== 1 ? 's' : ''}
                            {results.length === 200 ? ' (limit 200)' : ''}
                        </span>
                        {results.length > 0 && (
                            <span>
                                Total:{' '}
                                <strong style={{ color: 'var(--text-primary)' }}>
                                    {formatCurrency(totalAmount)}
                                </strong>
                            </span>
                        )}
                    </div>

                    {results.length === 0 ? (
                        <div
                            className="glass-panel"
                            style={{
                                padding: '40px',
                                textAlign: 'center',
                                color: 'var(--text-secondary)',
                            }}
                        >
                            No expenses match your search.
                        </div>
                    ) : (
                        <div className="glass-panel" style={{ overflow: 'hidden' }}>
                            {results.map((r, i) => {
                                const d = new Date(r.date);
                                const dateStr = d.toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                });
                                return (
                                    <div
                                        key={r.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '12px 20px',
                                            borderBottom:
                                                i < results.length - 1
                                                    ? '1px solid var(--border-color)'
                                                    : 'none',
                                            transition: 'background 0.1s',
                                        }}
                                        onMouseEnter={(e) =>
                                            (e.currentTarget.style.background =
                                                'rgba(255,255,255,0.03)')
                                        }
                                        onMouseLeave={(e) =>
                                            (e.currentTarget.style.background = 'transparent')
                                        }
                                    >
                                        {/* Date */}
                                        <div
                                            style={{
                                                minWidth: '100px',
                                                fontSize: '0.8rem',
                                                color: 'var(--text-secondary)',
                                            }}
                                        >
                                            {dateStr}
                                        </div>

                                        {/* Statement */}
                                        <div style={{ flex: 1 }}>
                                            <div
                                                style={{
                                                    fontSize: '0.95rem',
                                                    color: 'var(--text-primary)',
                                                }}
                                            >
                                                {r.statement}
                                            </div>
                                            {r.notes && (
                                                <div
                                                    style={{
                                                        fontSize: '0.78rem',
                                                        color: 'var(--text-secondary)',
                                                        marginTop: '2px',
                                                    }}
                                                >
                                                    {r.notes}
                                                </div>
                                            )}
                                        </div>

                                        {/* Tag */}
                                        {r.tag_name && (
                                            <div
                                                style={{
                                                    padding: '3px 10px',
                                                    borderRadius: '12px',
                                                    background: 'var(--bg-panel)',
                                                    border: '1px solid var(--border-color)',
                                                    fontSize: '0.75rem',
                                                    color: 'var(--text-secondary)',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {r.tag_name}
                                            </div>
                                        )}

                                        {/* Amount */}
                                        <div
                                            style={{
                                                fontWeight: '700',
                                                fontSize: '1rem',
                                                minWidth: '80px',
                                                textAlign: 'right',
                                            }}
                                        >
                                            {formatCurrency(r.amount)}
                                        </div>

                                        {/* Link to month */}
                                        <Link
                                            to={monthLink(r.date)}
                                            style={{
                                                color: 'var(--accent-primary)',
                                                fontSize: '0.78rem',
                                                textDecoration: 'none',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            View →
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {!loading && !searched && (
                <div
                    style={{
                        textAlign: 'center',
                        color: 'var(--text-secondary)',
                        padding: '40px',
                        fontSize: '0.9rem',
                    }}
                >
                    Start typing to search across all your expenses
                </div>
            )}
        </div>
    );
}
