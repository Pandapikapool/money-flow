interface Props {
    stage: number;
    variant?: string; // kept for backwards compat; no longer rendered
}

export default function Garden({ stage }: Props) {
    const cappedStage = Math.min(Math.max(stage, 0), 30);
    const stemTopY = 134 - cappedStage * 3;
    const stemPath = `M 60 140 C 60 ${135 - cappedStage} 60 ${(140 + stemTopY) / 2} 60 ${stemTopY}`;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <svg width="120" height="170" viewBox="0 0 120 170" aria-label={`Garden, stage ${stage}`}>
                {/* pot */}
                <path d="M30 142 L36 162 H84 L90 142 Z" fill="#C9A57F" />
                <ellipse cx="60" cy="142" rx="30" ry="4.5" fill="#B59872" />
                <ellipse cx="60" cy="142" rx="26" ry="3" fill="#5A4A3A" />

                {/* stem */}
                {cappedStage >= 1 && (
                    <path
                        d={stemPath}
                        stroke="#7D8F6F"
                        strokeWidth="2"
                        strokeLinecap="round"
                        fill="none"
                    />
                )}

                {/* leaves appear at staged milestones */}
                {cappedStage >= 1 && (
                    <path d="M60 132 C 52 126 47 132 51 138 C 56 140 60 136 60 132 Z" fill="#A8B5A0" />
                )}
                {cappedStage >= 3 && (
                    <path d="M60 122 C 68 116 73 122 69 128 C 64 130 60 126 60 122 Z" fill="#B7C2AE" />
                )}
                {cappedStage >= 6 && (
                    <path d="M60 108 C 50 102 45 108 49 114 C 55 116 60 112 60 108 Z" fill="#A8B5A0" />
                )}
                {cappedStage >= 10 && (
                    <path d="M60 92 C 70 86 75 92 71 98 C 65 100 60 96 60 92 Z" fill="#B7C2AE" />
                )}
                {cappedStage >= 15 && (
                    <path d="M60 76 C 50 70 45 76 49 82 C 55 84 60 80 60 76 Z" fill="#A8B5A0" />
                )}

                {/* blooming flowers */}
                {cappedStage >= 20 && (
                    <>
                        <circle cx="54" cy="60" r="4" fill="#E8B4B8" />
                        <circle cx="66" cy="56" r="5" fill="#D88B96" />
                        <circle cx="60" cy="48" r="4" fill="#E8B4B8" />
                        <circle cx="60" cy="56" r="2" fill="#FBF0DA" />
                    </>
                )}
            </svg>
            <div style={{
                fontSize: '0.75rem',
                color: '#8A7560',
                letterSpacing: '0.02em',
            }}>
                day {cappedStage}
            </div>
        </div>
    );
}
