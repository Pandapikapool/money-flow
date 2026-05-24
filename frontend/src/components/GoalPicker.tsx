import { useState, useEffect } from "react";
import { fetchTags, type Tag } from "../lib/api";
import type { CreateGoalPayload, GoalKind } from "../lib/flowcraft";

interface Props {
    onCreate: (payload: CreateGoalPayload) => void;
    onClose: () => void;
}

export default function GoalPicker({ onCreate, onClose }: Props) {
    const [kind, setKind] = useState<GoalKind | null>(null);
    const [tags, setTags] = useState<Tag[]>([]);
    const [tagId, setTagId] = useState<number | ''>('');
    const [amount, setAmount] = useState('');
    const [count, setCount] = useState('2');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchTags().then(setTags).catch(console.error);
    }, []);

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onClose();
    };

    const handleSubmit = () => {
        setError('');
        if (kind === 'skip-category') {
            if (!tagId || typeof tagId !== 'number') {
                setError('Pick a category to skip.');
                return;
            }
            onCreate({ kind, target_tag_id: tagId });
            return;
        }
        if (kind === 'cap-category') {
            if (!tagId || typeof tagId !== 'number') {
                setError('Pick a category.');
                return;
            }
            const amt = parseFloat(amount);
            if (!amt || amt <= 0) {
                setError('Enter a cap amount.');
                return;
            }
            onCreate({ kind, target_tag_id: tagId, target_amount: amt });
            return;
        }
        if (kind === 'quiet-days') {
            const n = parseInt(count, 10);
            if (!n || n < 1 || n > 7) {
                setError('Pick a number between 1 and 7.');
                return;
            }
            onCreate({ kind, target_count: n });
            return;
        }
    };

    return (
        <div
            onClick={handleOverlayClick}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 11, 9, 0.45)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px',
                animation: 'gpFadeIn 0.15s ease',
            }}
        >
            <div className="glass-panel" style={{
                padding: '24px',
                maxWidth: '420px',
                width: '100%',
                animation: 'gpSlideUp 0.2s ease',
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                }}>
                    <h3 style={{
                        margin: 0,
                        fontSize: '1rem',
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                    }}>
                        {kind ? 'A small goal' : 'Pick a small goal'}
                    </h3>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                            padding: '4px 8px',
                            lineHeight: 1,
                        }}
                    >×</button>
                </div>

                {!kind && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <KindOption
                            label="Skip a category"
                            sub="Don't spend on one category this week"
                            onClick={() => setKind('skip-category')}
                        />
                        <KindOption
                            label="Cap a category"
                            sub="Keep one category under an amount this week"
                            onClick={() => setKind('cap-category')}
                        />
                        <KindOption
                            label="Quiet days"
                            sub="Have N days with no spending"
                            onClick={() => setKind('quiet-days')}
                        />
                    </div>
                )}

                {kind === 'skip-category' && (
                    <div>
                        <label style={fieldLabelStyle}>Category to skip</label>
                        <select
                            value={tagId}
                            onChange={(e) => setTagId(e.target.value ? Number(e.target.value) : '')}
                        >
                            <option value="">Pick one…</option>
                            {tags.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {kind === 'cap-category' && (
                    <>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={fieldLabelStyle}>Category</label>
                            <select
                                value={tagId}
                                onChange={(e) => setTagId(e.target.value ? Number(e.target.value) : '')}
                            >
                                <option value="">Pick one…</option>
                                {tags.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={fieldLabelStyle}>Cap this week (₹)</label>
                            <input
                                type="number"
                                step="50"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="1500"
                            />
                        </div>
                    </>
                )}

                {kind === 'quiet-days' && (
                    <div>
                        <label style={fieldLabelStyle}>How many quiet days?</label>
                        <select
                            value={count}
                            onChange={(e) => setCount(e.target.value)}
                        >
                            {[1, 2, 3, 4, 5, 6, 7].map(n => (
                                <option key={n} value={n}>{n} {n === 1 ? 'day' : 'days'}</option>
                            ))}
                        </select>
                    </div>
                )}

                {error && (
                    <p style={{
                        fontSize: '0.82rem',
                        color: 'var(--accent-warning)',
                        marginTop: '10px',
                        marginBottom: 0,
                        fontStyle: 'italic',
                    }}>
                        {error}
                    </p>
                )}

                {kind && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                        <button
                            onClick={() => { setKind(null); setError(''); }}
                            style={{
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border-color)',
                                padding: '10px 16px',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                            }}
                        >
                            Back
                        </button>
                        <button
                            onClick={handleSubmit}
                            style={{
                                flex: 1,
                                background: 'var(--accent-primary)',
                                color: '#fff',
                                border: 'none',
                                padding: '10px 16px',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: 500,
                            }}
                        >
                            Create goal
                        </button>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes gpFadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes gpSlideUp {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

const fieldLabelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
};

interface KindOptionProps {
    label: string;
    sub: string;
    onClick: () => void;
}
const KindOption = ({ label, sub, onClick }: KindOptionProps) => (
    <button
        onClick={onClick}
        style={{
            background: 'rgba(201, 166, 107, 0.08)',
            border: '1px solid rgba(201, 166, 107, 0.3)',
            borderRadius: '12px',
            padding: '14px 16px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background 0.15s ease',
            width: '100%',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(201, 166, 107, 0.16)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(201, 166, 107, 0.08)')}
    >
        <div style={{
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '2px',
        }}>
            {label}
        </div>
        <div style={{
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
        }}>
            {sub}
        </div>
    </button>
);
