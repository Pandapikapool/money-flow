import type { Insight, InsightTone } from "../lib/flowcraft";

interface Props {
    insight: Insight;
    onPrimaryAction?: (insight: Insight) => void;
    onDismiss?: (insight: Insight) => void;
}

const toneStyles: Record<InsightTone, { accent: string; tint: string }> = {
    'calm':              { accent: '#A8B5A0', tint: 'rgba(168, 181, 160, 0.10)' },
    'gentle-attention':  { accent: '#C9A66B', tint: 'rgba(201, 166, 107, 0.10)' },
    'compassionate':     { accent: '#E8B4B8', tint: 'rgba(232, 180, 184, 0.10)' },
};

export default function InsightCard({ insight, onPrimaryAction, onDismiss }: Props) {
    const tone = toneStyles[insight.tone] ?? toneStyles.calm;

    return (
        <div style={{
            padding: '20px',
            background: tone.tint,
            border: `1px solid ${tone.accent}55`,
            borderRadius: '14px',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
        }}>
            <div style={{
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
            }}>
                {insight.title}
            </div>
            <div style={{
                fontSize: '0.9rem',
                lineHeight: 1.55,
                color: 'var(--text-secondary)',
            }}>
                {insight.body}
            </div>
            {insight.impact && (
                <div style={{
                    fontSize: '0.8rem',
                    color: tone.accent,
                    fontWeight: 500,
                }}>
                    {insight.impact}
                </div>
            )}
            {insight.action && (
                <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => onPrimaryAction?.(insight)}
                        style={{
                            background: tone.accent,
                            color: '#fff',
                            border: 'none',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'opacity 0.18s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                        {insight.action.label}
                    </button>
                    <button
                        onClick={() => onDismiss?.(insight)}
                        style={{
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            border: 'none',
                            padding: '8px 14px',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            opacity: 0.7,
                        }}
                    >
                        Keep as is
                    </button>
                </div>
            )}
        </div>
    );
}
