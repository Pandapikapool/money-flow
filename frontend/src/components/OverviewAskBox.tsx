import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAnalyticsQuery } from "../lib/flowcraft";
import { fetchTags, type Tag } from "../lib/api";
import { formatCurrency } from "../lib/format";

const PERIOD_PRESETS = [
    { label: "This month",   value: "this-month" },
    { label: "Last 30 days", value: "last-30" },
    { label: "Last 90 days", value: "last-90" },
    { label: "This year",    value: "this-year" },
    { label: "All time",     value: "all" },
] as const;

function periodToDates(preset: string): { from?: string; to?: string } {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    switch (preset) {
        case "this-month": {
            const from = new Date(today.getFullYear(), today.getMonth(), 1)
                .toISOString().slice(0, 10);
            return { from, to: todayStr };
        }
        case "last-30": {
            const from = new Date(today.getTime() - 30 * 86400000)
                .toISOString().slice(0, 10);
            return { from, to: todayStr };
        }
        case "last-90": {
            const from = new Date(today.getTime() - 90 * 86400000)
                .toISOString().slice(0, 10);
            return { from, to: todayStr };
        }
        case "this-year": {
            const from = `${today.getFullYear()}-01-01`;
            return { from, to: todayStr };
        }
        default:
            return {};
    }
}

export default function OverviewAskBox() {
    const [category, setCategory] = useState<string>("all");
    const [period, setPeriod] = useState<string>("last-30");
    const [tags, setTags] = useState<Tag[]>([]);

    useEffect(() => {
        fetchTags().then(setTags).catch(console.error);
    }, []);

    const { from, to } = periodToDates(period);

    const { data, isLoading } = useQuery({
        queryKey: ['analytics-query', category, from, to],
        queryFn: () => fetchAnalyticsQuery({
            category: category === "all" ? undefined : category,
            from,
            to,
        }),
        staleTime: 30_000,
    });

    return (
        <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '24px' }}>
            <div style={{
                fontSize: '0.72rem',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
            }}>
                <span>Quick ask</span>
                <span style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-secondary)',
                    textTransform: 'none',
                    letterSpacing: 0,
                    opacity: 0.7,
                }}>
                    — slice your spend in two taps
                </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ flex: '1 1 160px', minWidth: '140px' }}
                >
                    <option value="all">All categories</option>
                    {tags.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    style={{ flex: '1 1 160px', minWidth: '140px' }}
                >
                    {PERIOD_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
            </div>

            {isLoading && !data && (
                <div style={{
                    color: 'var(--text-secondary)',
                    fontStyle: 'italic',
                    fontSize: '0.85rem',
                }}>Counting…</div>
            )}

            {data && (
                <div>
                    <div style={{
                        display: 'flex',
                        gap: '24px',
                        flexWrap: 'wrap',
                        marginBottom: (data.top_categories?.length ?? 0) > 0 || data.monthly.length > 1 ? '18px' : 0,
                    }}>
                        <Stat label="Total" value={formatCurrency(data.total)} primary />
                        <Stat label={data.count === 1 ? "Expense" : "Expenses"} value={String(data.count)} />
                        {data.count > 0 && <Stat label="Avg" value={formatCurrency(data.avg)} />}
                        {data.count > 0 && <Stat label="Max" value={formatCurrency(data.max)} />}
                    </div>

                    {data.count === 0 && (
                        <div style={{
                            color: 'var(--text-secondary)',
                            fontStyle: 'italic',
                            fontSize: '0.88rem',
                        }}>
                            Nothing in this slice. That's allowed.
                        </div>
                    )}

                    {data.top_categories && data.top_categories.length > 0 && (
                        <div style={{
                            borderTop: '1px solid var(--border-color)',
                            paddingTop: '14px',
                            marginBottom: data.monthly.length > 1 ? '14px' : 0,
                        }}>
                            <div style={subLabel}>top categories</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {data.top_categories.map(c => {
                                    const pct = data.total > 0 ? (c.total / data.total) * 100 : 0;
                                    return (
                                        <div key={c.tag}>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontSize: '0.85rem',
                                                marginBottom: '4px',
                                            }}>
                                                <span style={{ color: 'var(--text-primary)' }}>{c.tag}</span>
                                                <span style={{ color: 'var(--text-secondary)' }}>
                                                    {formatCurrency(c.total)} · {c.count}
                                                </span>
                                            </div>
                                            <div style={{
                                                height: '4px',
                                                background: 'rgba(122, 111, 102, 0.14)',
                                                borderRadius: '2px',
                                                overflow: 'hidden',
                                            }}>
                                                <div style={{
                                                    width: `${pct}%`,
                                                    height: '100%',
                                                    background: 'var(--accent-primary)',
                                                }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {data.monthly.length > 1 && (
                        <div style={{
                            borderTop: '1px solid var(--border-color)',
                            paddingTop: '14px',
                        }}>
                            <div style={subLabel}>by month</div>
                            <MonthlyBars data={data.monthly} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

interface StatProps { label: string; value: string; primary?: boolean }
const Stat = ({ label, value, primary }: StatProps) => (
    <div>
        <div style={{
            fontSize: '0.7rem',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
        }}>
            {label}
        </div>
        <div style={{
            fontSize: primary ? '1.6rem' : '1rem',
            fontWeight: primary ? 600 : 500,
            color: 'var(--text-primary)',
            marginTop: '2px',
            letterSpacing: primary ? '-0.02em' : 'normal',
        }}>
            {value}
        </div>
    </div>
);

interface MonthlyBarsProps {
    data: { month: string; total: number; count: number }[];
}
const MonthlyBars = ({ data }: MonthlyBarsProps) => {
    const max = Math.max(1, ...data.map(d => d.total));
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${data.length}, 1fr)`,
            gap: '6px',
            alignItems: 'end',
            height: '60px',
        }}>
            {data.map(d => (
                <div key={d.month}
                    title={`${d.month}: ${formatCurrency(d.total)} (${d.count})`}
                    style={{
                        height: `${Math.max(2, (d.total / max) * 100)}%`,
                        background: 'rgba(168, 181, 160, 0.7)',
                        borderRadius: '3px 3px 1px 1px',
                    }}
                />
            ))}
        </div>
    );
};

const subLabel: React.CSSProperties = {
    fontSize: '0.7rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '10px',
};
