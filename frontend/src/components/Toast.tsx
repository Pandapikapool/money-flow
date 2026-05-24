import { useEffect, useState, useCallback } from 'react';

export interface ToastOptions {
    message: string;
    undoLabel?: string;
    onUndo?: () => void;
    duration?: number; // ms, default 5000
}

interface ToastState extends ToastOptions {
    id: number;
    progress: number; // 0–100
}

let _show: ((opts: ToastOptions) => void) | null = null;

export function showToast(opts: ToastOptions) {
    _show?.(opts);
}

export function Toast() {
    const [toast, setToast] = useState<ToastState | null>(null);

    const dismiss = useCallback(() => setToast(null), []);

    useEffect(() => {
        _show = (opts) => {
            setToast({ ...opts, id: Date.now(), progress: 100 });
        };
        return () => {
            _show = null;
        };
    }, []);

    useEffect(() => {
        if (!toast) return;
        const duration = toast.duration ?? 5000;
        const interval = 50;
        const step = (interval / duration) * 100;
        const timer = setInterval(() => {
            setToast((prev) => {
                if (!prev) return null;
                const next = prev.progress - step;
                if (next <= 0) {
                    clearInterval(timer);
                    return null;
                }
                return { ...prev, progress: next };
            });
        }, interval);
        return () => clearInterval(timer);
    }, [toast?.id]);

    if (!toast) return null;

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 2000,
                minWidth: '280px',
                maxWidth: '420px',
                animation: 'slideUp 0.2s ease',
            }}
        >
            <div
                className="glass-panel"
                style={{
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Progress bar */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        height: '3px',
                        width: `${toast.progress}%`,
                        background: 'var(--accent-primary)',
                        transition: 'width 0.05s linear',
                        borderRadius: '0 0 0 var(--radius-lg)',
                    }}
                />

                <span style={{ flex: 1, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {toast.message}
                </span>

                {toast.onUndo && (
                    <button
                        onClick={() => {
                            toast.onUndo!();
                            dismiss();
                        }}
                        style={{
                            background: 'var(--accent-primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '0.82rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {toast.undoLabel ?? 'Undo'}
                    </button>
                )}

                <button
                    onClick={dismiss}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        padding: '0 4px',
                        lineHeight: 1,
                    }}
                >
                    ×
                </button>
            </div>

            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateX(-50%) translateY(12px); }
                    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
            `}</style>
        </div>
    );
}
