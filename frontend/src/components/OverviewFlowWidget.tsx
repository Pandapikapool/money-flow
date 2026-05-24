import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchActiveGoal } from '../lib/flowcraft';

const DISMISS_KEY = 'flowcraft.overview.widget.dismissedAt';
const DISMISS_HOURS = 48; // re-appear after this long

function isDismissedRecently(): boolean {
    try {
        const raw = localStorage.getItem(DISMISS_KEY);
        if (!raw) return false;
        const ts = parseInt(raw, 10);
        if (!ts) return false;
        const ageMs = Date.now() - ts;
        return ageMs < DISMISS_HOURS * 60 * 60 * 1000;
    } catch {
        return false;
    }
}

export default function OverviewFlowWidget() {
    const [dismissed, setDismissed] = useState<boolean>(() => isDismissedRecently());

    // Stay subscribed to the same query key /flow uses, so creating a goal
    // there hides this widget without a refresh.
    const { data: activeGoal } = useQuery({
        queryKey: ['flowcraft-active-goal'],
        queryFn: fetchActiveGoal,
        staleTime: 60_000,
    });

    useEffect(() => {
        // If a goal exists, the dismissed flag is irrelevant; cleared on next render anyway.
    }, [activeGoal]);

    if (activeGoal || dismissed) return null;

    const handleDismiss = () => {
        try {
            localStorage.setItem(DISMISS_KEY, String(Date.now()));
        } catch {
            // ignore storage errors
        }
        setDismissed(true);
    };

    return (
        <div
            style={{
                padding: '14px 18px',
                marginBottom: '20px',
                background: 'rgba(201, 166, 107, 0.10)',
                border: '1px solid rgba(201, 166, 107, 0.30)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                flexWrap: 'wrap',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flex: '1 1 240px',
                    minWidth: 0,
                }}
            >
                <img
                    src="/mascot.svg"
                    alt=""
                    width="36"
                    height="36"
                    style={{ flexShrink: 0, opacity: 0.95 }}
                    draggable={false}
                />
                <div style={{ minWidth: 0 }}>
                    <div
                        style={{
                            fontSize: '0.92rem',
                            color: 'var(--text-primary)',
                            fontWeight: 500,
                        }}
                    >
                        Want a small goal this week?
                    </div>
                    <div
                        style={{
                            fontSize: '0.78rem',
                            color: 'var(--text-secondary)',
                            marginTop: '2px',
                        }}
                    >
                        Skippable. Garden gets a small bonus if you hold it.
                    </div>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                <Link
                    to="/flow"
                    style={{
                        background: 'var(--accent-primary)',
                        color: '#fff',
                        textDecoration: 'none',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                    }}
                >
                    Open Flow
                </Link>
                <button
                    onClick={handleDismiss}
                    aria-label="Dismiss"
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '1.1rem',
                        padding: '4px 8px',
                        lineHeight: 1,
                        opacity: 0.6,
                    }}
                >
                    ×
                </button>
            </div>
        </div>
    );
}
