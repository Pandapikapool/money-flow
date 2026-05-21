import { useState, useEffect } from "react";

interface Props {
    message?: string;
    size?: number;
}

export default function Mascot({ message, size = 110 }: Props) {
    const [showBubble, setShowBubble] = useState(true);

    // Reset bubble if message changes
    useEffect(() => { setShowBubble(true); }, [message]);

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            {message && showBubble && (
                <div style={{
                    position: 'absolute',
                    bottom: '92%',
                    right: '-12px',
                    marginBottom: '6px',
                    padding: '14px 16px 14px 18px',
                    background: 'rgba(255, 252, 245, 0.92)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(201, 166, 107, 0.25)',
                    borderRadius: '16px',
                    boxShadow: '0 6px 20px rgba(58, 46, 37, 0.08)',
                    fontSize: '0.9rem',
                    color: '#3A2E25',
                    minWidth: '180px',
                    maxWidth: '260px',
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontStyle: 'italic',
                    lineHeight: 1.45,
                }}>
                    {message}
                    <button
                        onClick={() => setShowBubble(false)}
                        aria-label="Dismiss"
                        style={{
                            position: 'absolute',
                            top: '4px',
                            right: '6px',
                            background: 'transparent',
                            border: 'none',
                            color: '#8A7560',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            padding: '4px 8px',
                            lineHeight: 1,
                            opacity: 0.6,
                        }}
                    >×</button>
                </div>
            )}
            <img
                src="/mascot.svg"
                alt="Coin"
                width={size}
                height={size}
                style={{ display: 'block', userSelect: 'none' }}
                draggable={false}
            />
        </div>
    );
}
