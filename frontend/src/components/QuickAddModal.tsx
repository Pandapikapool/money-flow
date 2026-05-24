import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import ExpenseForm from "./ExpenseForm";

interface Props {
    onClose: () => void;
}

export default function QuickAddModal({ onClose }: Props) {
    const queryClient = useQueryClient();
    const overlayRef = useRef<HTMLDivElement>(null);

    // Lock body scroll while open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const handleSuccess = () => {
        // Invalidate anything that shows expense counts / summaries
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        queryClient.invalidateQueries({ queryKey: ['year-summary'] });
        onClose();
    };

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === overlayRef.current) onClose();
    };

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                paddingTop: '80px',
                paddingBottom: '40px',
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                zIndex: 1000,
                animation: 'fadeIn 0.15s ease',
            }}
        >
            <div style={{
                width: '100%',
                maxWidth: '480px',
                animation: 'slideDown 0.2s ease',
                position: 'relative',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                    padding: '0 4px',
                }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                        Quick Add — <kbd style={{ background: 'rgba(255,255,255,0.15)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>Esc</kbd> to close
                    </span>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            color: 'rgba(255,255,255,0.7)',
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        ×
                    </button>
                </div>

                <ExpenseForm onSuccess={handleSuccess} />
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-16px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
