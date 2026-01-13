import { useMemo } from 'react';
import { SETTINGS } from '../lib/settings';

interface Props {
    spent: number;
    budget: number;
}

export default function BudgetBar({ spent, budget }: Props) {
    const percentage = useMemo(() => {
        if (budget <= 0) return 0;
        const p = (spent / budget) * 100;
        return Math.min(p, 100); // Cap visual at 100%
    }, [spent, budget]);

    const color = useMemo(() => {
        if (percentage >= 100) return 'var(--accent-danger)';
        if (percentage >= 85) return 'var(--accent-warning)';
        return 'var(--accent-success)';
    }, [percentage]);

    return (
        <div style={{ width: '100%', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <span>Spent: {SETTINGS.CURRENCY}{spent.toFixed(2)}</span>
                <span>Budget: {SETTINGS.CURRENCY}{budget.toFixed(0)}</span>
            </div>
            <div style={{
                height: '12px',
                width: '100%',
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '6px',
                overflow: 'hidden'
            }}>
                <div style={{
                    height: '100%',
                    width: `${percentage}%`,
                    backgroundColor: color,
                    transition: 'width 0.5s ease-out, background-color 0.3s'
                }} />
            </div>
        </div>
    );
}
