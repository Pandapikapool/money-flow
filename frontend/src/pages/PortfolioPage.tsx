import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
    fetchFixedReturnsSummary, fetchSIPSummary, fetchRDSummary,
    fetchStocksSummary,
    type FixedReturnsSummary, type SIPSummary, type RDSummary, type StocksSummary
} from "../lib/api";
import { formatCurrency } from "../lib/format";

interface Slice {
    name: string;
    invested: number;
    current: number;
    path: string;
    color: string;
    isUSD?: boolean;
}

// Tea Ceremony chart palette — desaturated, warm; matches the app tokens.
const COLORS = ['#C9A66B', '#A8B5A0', '#D88B96', '#B9B5C9', '#D6B894', '#8FB39E'];

export default function PortfolioPage() {
    const [fixed, setFixed] = useState<FixedReturnsSummary | null>(null);
    const [sip, setSip] = useState<SIPSummary | null>(null);
    const [rd, setRd] = useState<RDSummary | null>(null);
    const [indianStocks, setIndianStocks] = useState<StocksSummary | null>(null);
    const [usStocks, setUsStocks] = useState<StocksSummary | null>(null);
    const [crypto, setCrypto] = useState<StocksSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetchFixedReturnsSummary().catch(() => null),
            fetchSIPSummary().catch(() => null),
            fetchRDSummary().catch(() => null),
            fetchStocksSummary('indian').catch(() => null),
            fetchStocksSummary('us').catch(() => null),
            fetchStocksSummary('crypto').catch(() => null),
        ]).then(([f, s, r, ind, us, cr]) => {
            setFixed(f); setSip(s); setRd(r);
            setIndianStocks(ind); setUsStocks(us); setCrypto(cr);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading…</div>;

    const slices: Slice[] = [
        { name: 'Fixed Returns', invested: fixed?.total_invested ?? 0, current: fixed?.total_expected ?? 0, path: '/investments/fixed', color: COLORS[0] },
        { name: 'SIP / MF', invested: sip?.total_invested ?? 0, current: sip?.current_value ?? 0, path: '/investments/sip', color: COLORS[1] },
        { name: 'Rec. Deposits', invested: rd?.total_invested ?? 0, current: rd?.total_maturity ?? 0, path: '/investments/rd', color: COLORS[2] },
        { name: 'Indian Stocks', invested: indianStocks?.total_invested ?? 0, current: indianStocks?.current_value ?? 0, path: '/investments/stocks/indian', color: COLORS[3] },
        { name: 'US Stocks', invested: usStocks?.total_invested ?? 0, current: usStocks?.current_value ?? 0, path: '/investments/stocks/us', color: COLORS[4], isUSD: true },
        { name: 'Crypto', invested: crypto?.total_invested ?? 0, current: crypto?.current_value ?? 0, path: '/investments/stocks/crypto', color: COLORS[5], isUSD: true },
    ].filter(s => s.invested > 0);

    const totalInvestedINR = slices.filter(s => !s.isUSD).reduce((sum, s) => sum + s.invested, 0);
    const totalCurrentINR  = slices.filter(s => !s.isUSD).reduce((sum, s) => sum + s.current, 0);
    const totalInvestedUSD = slices.filter(s => s.isUSD).reduce((sum, s) => sum + s.invested, 0);
    const totalCurrentUSD  = slices.filter(s => s.isUSD).reduce((sum, s) => sum + s.current, 0);

    const gainINR = totalCurrentINR - totalInvestedINR;
    const gainPctINR = totalInvestedINR > 0 ? (gainINR / totalInvestedINR) * 100 : 0;
    const gainUSD = totalCurrentUSD - totalInvestedUSD;
    const gainPctUSD = totalInvestedUSD > 0 ? (gainUSD / totalInvestedUSD) * 100 : 0;

    const pieData = slices.map(s => ({ name: s.name, value: s.invested }));

    const fmtUSD = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
                <div>
                    <h1 style={{ margin: 0 }}>Portfolio</h1>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        All investments in one view
                    </p>
                </div>
                <Link to="/investments" style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--accent-primary)', textDecoration: 'none' }}>
                    ← Investment hub
                </Link>
            </div>

            {/* Hero totals */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                {/* INR summary */}
                <div className="glass-panel" style={{ padding: '22px', borderLeft: '4px solid var(--accent-primary)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>INR Investments</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: '800' }}>{formatCurrency(totalCurrentINR)}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        invested {formatCurrency(totalInvestedINR)}
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '0.95rem', fontWeight: '700', color: gainINR >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                        {gainINR >= 0 ? '+' : ''}{formatCurrency(gainINR)} ({gainPctINR >= 0 ? '+' : ''}{gainPctINR.toFixed(1)}%)
                    </div>
                </div>

                {/* USD summary */}
                {totalInvestedUSD > 0 && (
                    <div className="glass-panel" style={{ padding: '22px', borderLeft: '4px solid #60a5fa' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>USD Investments</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: '800' }}>{fmtUSD(totalCurrentUSD)}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            invested {fmtUSD(totalInvestedUSD)}
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '0.95rem', fontWeight: '700', color: gainUSD >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                            {gainUSD >= 0 ? '+' : ''}{fmtUSD(gainUSD)} ({gainPctUSD >= 0 ? '+' : ''}{gainPctUSD.toFixed(1)}%)
                        </div>
                    </div>
                )}

                {/* Count */}
                <div className="glass-panel" style={{ padding: '22px', borderLeft: '4px solid var(--accent-success)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Active Instruments</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: '800' }}>{slices.length}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {[fixed?.ongoing_count, sip?.ongoing_count, rd?.ongoing_count,
                          indianStocks?.holding_count, usStocks?.holding_count, crypto?.holding_count]
                          .filter(Boolean).join(' + ')} individual positions
                    </div>
                </div>
            </div>

            {/* Chart + Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>

                {/* Allocation pie */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '1rem', color: 'var(--text-secondary)' }}>Allocation by Invested Amount</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {pieData.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                                formatter={(value, name) => {
                                    const s = slices.find(sl => sl.name === name);
                                    return [s?.isUSD ? fmtUSD(Number(value)) : formatCurrency(Number(value)), name];
                                }}
                            />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Table */}
                <div className="glass-panel" style={{ padding: '24px', overflow: 'hidden' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '1rem', color: 'var(--text-secondary)' }}>Category Breakdown</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                            <thead>
                                <tr style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                    <th style={{ textAlign: 'left', paddingBottom: '10px', paddingRight: '12px' }}>Category</th>
                                    <th style={{ textAlign: 'right', paddingBottom: '10px', paddingRight: '12px' }}>Invested</th>
                                    <th style={{ textAlign: 'right', paddingBottom: '10px', paddingRight: '12px' }}>Current</th>
                                    <th style={{ textAlign: 'right', paddingBottom: '10px' }}>P&L</th>
                                </tr>
                            </thead>
                            <tbody>
                                {slices.map((s, i) => {
                                    const gain = s.current - s.invested;
                                    const gainPct = s.invested > 0 ? (gain / s.invested) * 100 : 0;
                                    const fmt = s.isUSD ? fmtUSD : formatCurrency;
                                    return (
                                        <tr key={s.name} style={{ borderTop: i > 0 ? '1px solid var(--border-color)' : 'none' }}>
                                            <td style={{ padding: '10px 12px 10px 0' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                                                    <Link to={s.path} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                                                        {s.name}
                                                    </Link>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right', padding: '10px 12px', color: 'var(--text-secondary)' }}>{fmt(s.invested)}</td>
                                            <td style={{ textAlign: 'right', padding: '10px 12px', fontWeight: '600' }}>{fmt(s.current)}</td>
                                            <td style={{ textAlign: 'right', padding: '10px 0', color: gain >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                                {gain >= 0 ? '+' : ''}{fmt(gain)}<br />
                                                <span style={{ fontSize: '0.75rem', fontWeight: '400' }}>
                                                    {gainPct >= 0 ? '+' : ''}{gainPct.toFixed(1)}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
