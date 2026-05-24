import type { ActiveGoalResponse } from '../lib/flowcraft';

interface Props {
    activeGoal: ActiveGoalResponse | null;
    onPickClicked: () => void;
    onCancel: (id: number) => void;
}

export default function GoalCard({ activeGoal, onPickClicked, onCancel }: Props) {
    if (!activeGoal) {
        return (
            <div
                className="glass-panel"
                style={{
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap',
                }}
            >
                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                    <h2
                        style={{
                            fontSize: '0.95rem',
                            margin: 0,
                            color: 'var(--text-primary)',
                            fontWeight: 600,
                        }}
                    >
                        A small thing to try this week?
                    </h2>
                    <p
                        style={{
                            fontSize: '0.82rem',
                            color: 'var(--text-secondary)',
                            margin: '4px 0 0',
                        }}
                    >
                        Optional. Skippable. Garden gets a small bonus if you hold it.
                    </p>
                </div>
                <button
                    onClick={onPickClicked}
                    style={{
                        background: 'var(--accent-primary)',
                        color: '#fff',
                        border: 'none',
                        padding: '10px 18px',
                        borderRadius: '10px',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'opacity 0.18s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                    Pick a goal
                </button>
            </div>
        );
    }

    const { goal, progress } = activeGoal;

    const pct =
        progress.denominator > 0
            ? Math.min(100, Math.round((progress.numerator / progress.denominator) * 100))
            : progress.held
              ? 100
              : 0;

    const barColor = progress.held
        ? 'var(--accent-success)'
        : progress.missed
          ? 'var(--accent-warning)'
          : 'var(--accent-primary)';

    return (
        <div className="glass-panel" style={{ padding: '22px 24px' }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                    gap: '12px',
                }}
            >
                <div style={{ minWidth: 0 }}>
                    <div
                        style={{
                            fontSize: '0.72rem',
                            color: 'var(--text-secondary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            marginBottom: '4px',
                        }}
                    >
                        This week's goal
                    </div>
                    <h2
                        style={{
                            fontSize: '1.05rem',
                            margin: 0,
                            color: 'var(--text-primary)',
                            fontWeight: 600,
                        }}
                    >
                        {progress.headline}
                    </h2>
                </div>
                {goal.status === 'active' && (
                    <button
                        onClick={() => onCancel(goal.id)}
                        style={{
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            border: 'none',
                            padding: '4px 10px',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            opacity: 0.7,
                            flexShrink: 0,
                        }}
                    >
                        Cancel
                    </button>
                )}
            </div>

            <div
                style={{
                    fontSize: '0.88rem',
                    color: 'var(--text-secondary)',
                    marginBottom: progress.denominator > 0 ? '10px' : '0',
                }}
            >
                {progress.display}
            </div>

            {progress.denominator > 0 && (
                <div
                    style={{
                        height: '6px',
                        background: 'rgba(122, 111, 102, 0.14)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: barColor,
                            transition: 'width 0.3s ease',
                        }}
                    />
                </div>
            )}

            {progress.held && (
                <p
                    style={{
                        fontSize: '0.85rem',
                        color: 'var(--accent-success)',
                        marginTop: '10px',
                        marginBottom: 0,
                        fontStyle: 'italic',
                    }}
                >
                    Held it. Nice work.
                </p>
            )}
            {progress.missed && (
                <p
                    style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        marginTop: '10px',
                        marginBottom: 0,
                        fontStyle: 'italic',
                    }}
                >
                    Not this time, that's allowed.
                </p>
            )}
        </div>
    );
}
