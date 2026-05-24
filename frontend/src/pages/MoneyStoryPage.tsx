import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchWeekStory } from "../lib/flowcraft";
import { formatCurrency } from "../lib/format";

export default function MoneyStoryPage() {
    const [weekOffset, setWeekOffset] = useState(0);
    const { data: story, isLoading } = useQuery({
        queryKey: ['flowcraft-story', weekOffset],
        queryFn: () => fetchWeekStory(weekOffset),
    });

    const maxDayTotal = Math.max(1, ...(story?.by_day ?? []).map(d => d.total));

    return (
        <div style={{
            maxWidth: '720px',
            margin: '0 auto',
            padding: '8px 0 40px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
        }}>
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                    <h1 style={{
                        fontSize: '1.4rem',
                        fontWeight: 600,
                        margin: 0,
                        color: 'var(--text-primary)',
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        letterSpacing: '-0.01em',
                    }}>
                        Money story
                    </h1>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {weekOffset === 0 ? 'this week, gently summarised' : `${weekOffset} week${weekOffset > 1 ? 's' : ''} ago`}
                    </div>
                </div>
                <Link to="/flow" style={{
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    padding: '6px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                }}>
                    ← Flow
                </Link>
            </header>

            {/* Week nav */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <button
                    onClick={() => setWeekOffset(weekOffset + 1)}
                    style={navBtn}
                    disabled={weekOffset >= 52}
                >
                    ← earlier week
                </button>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {story?.week_label ?? '…'}
                </div>
                <button
                    onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
                    style={{ ...navBtn, visibility: weekOffset === 0 ? 'hidden' : 'visible' }}
                >
                    later week →
                </button>
            </div>

            {isLoading && !story && (
                <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Loading…</div>
            )}

            {story && (
                <>
                    {/* Total tile */}
                    <section className="glass-panel" style={{ padding: '24px' }}>
                        <div style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            marginBottom: '6px',
                        }}>
                            Spent this week
                        </div>
                        <div style={{
                            fontSize: '2rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            letterSpacing: '-0.02em',
                            fontFamily: 'Georgia, "Times New Roman", serif',
                        }}>
                            {formatCurrency(story.total)}
                        </div>
                        <div style={{
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)',
                            marginTop: '4px',
                        }}>
                            across {story.count} {story.count === 1 ? 'expense' : 'expenses'}
                        </div>
                    </section>

                    {/* By-day bars */}
                    <section className="glass-panel" style={{ padding: '24px' }}>
                        <div style={sectionLabel}>by day</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', alignItems: 'end', height: '120px' }}>
                            {story.by_day.map(d => {
                                const isBig = story.biggest_day && d.date === story.biggest_day.date;
                                const heightPct = (d.total / maxDayTotal) * 100;
                                return (
                                    <div key={d.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                                        <div title={`${d.weekday}: ${formatCurrency(d.total)}`} style={{
                                            width: '100%',
                                            height: `${Math.max(2, heightPct)}%`,
                                            background: isBig ? 'var(--accent-primary)' : 'rgba(168, 181, 160, 0.6)',
                                            borderRadius: '6px 6px 2px 2px',
                                            transition: 'background 0.18s ease',
                                        }} />
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginTop: '8px' }}>
                            {story.by_day.map(d => (
                                <div key={d.date} style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                    {d.weekday}
                                </div>
                            ))}
                        </div>
                        {story.biggest_day && (
                            <div style={{ marginTop: '14px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Biggest day was <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{story.biggest_day.weekday}</span> — {formatCurrency(story.biggest_day.total)}.
                            </div>
                        )}
                    </section>

                    {/* Top categories */}
                    {story.top_categories.length > 0 && (
                        <section className="glass-panel" style={{ padding: '24px' }}>
                            <div style={sectionLabel}>top categories</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {story.top_categories.map((c, i) => {
                                    const pct = story.total > 0 ? (c.total / story.total) * 100 : 0;
                                    return (
                                        <div key={c.tag}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                                                <span style={{ color: 'var(--text-primary)' }}>{c.tag}</span>
                                                <span style={{ color: 'var(--text-secondary)' }}>{formatCurrency(c.total)}</span>
                                            </div>
                                            <div style={{ height: '5px', background: 'rgba(122, 111, 102, 0.12)', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${pct}%`,
                                                    height: '100%',
                                                    background: i === 0 ? 'var(--accent-primary)' : 'rgba(168, 181, 160, 0.8)',
                                                }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Moods */}
                    {story.mood_counts.length > 0 && (
                        <section className="glass-panel" style={{ padding: '24px' }}>
                            <div style={sectionLabel}>moods tagged</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {story.mood_counts.map(m => (
                                    <span key={m.mood} style={{
                                        padding: '6px 14px',
                                        borderRadius: '16px',
                                        fontSize: '0.85rem',
                                        background: 'rgba(201, 166, 107, 0.10)',
                                        border: '1px solid rgba(201, 166, 107, 0.3)',
                                        color: 'var(--text-primary)',
                                        textTransform: 'capitalize',
                                    }}>
                                        {m.mood} · {m.count}
                                    </span>
                                ))}
                            </div>
                        </section>
                    )}

                    {story.count === 0 && (
                        <section className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            Quiet week — nothing logged. That's a story too.
                        </section>
                    )}
                </>
            )}
        </div>
    );
}

const sectionLabel: React.CSSProperties = {
    fontSize: '0.72rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '14px',
};

const navBtn: React.CSSProperties = {
    background: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    cursor: 'pointer',
};
