import { Outlet, NavLink } from 'react-router-dom';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPlans, fetchLifeXpBuckets, type Plan, type LifeXpBucket } from '../lib/api';
import { useAppStore } from '../store/appStore';
import QuickAddModal from '../components/QuickAddModal';
import { Toast } from '../components/Toast';

const navGroups = [
    {
        label: 'Money',
        items: [
            { to: '/overview', label: 'Overview' },
            { to: '/daily', label: 'Add expense' },
            { to: '/flow', label: 'Flow' },
            { to: '/search', label: 'Search' },
            { to: '/expenses', label: 'Expenses' },
            { to: '/budget', label: 'Budget' },
        ],
    },
    {
        label: 'Wealth',
        items: [
            { to: '/accounts', label: 'Accounts' },
            { to: '/assets', label: 'Assets' },
            { to: '/investments', label: 'Investments' },
        ],
    },
    {
        label: 'Life',
        items: [
            { to: '/plans', label: 'Insurance' },
            { to: '/life-xp', label: 'Life XP' },
            { to: '/tags', label: 'Tags' },
        ],
    },
];

const getDaysUntil = (date: string | null): number | null => {
    if (!date) return null;
    const target = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const isPremiumDue = (nextPremiumDate: string | null, expiryDate: string | null): boolean => {
    if (expiryDate) {
        const expiryDays = getDaysUntil(expiryDate);
        if (expiryDays !== null && expiryDays < 0) return false;
    }
    const days = getDaysUntil(nextPremiumDate);
    return days !== null && days <= 15;
};

const isExpired = (expiryDate: string | null): boolean => {
    const days = getDaysUntil(expiryDate);
    return days !== null && days < 0;
};

const isExpiringSoon = (expiryDate: string | null): boolean => {
    const days = getDaysUntil(expiryDate);
    return days !== null && days >= 0 && days <= 60;
};

const getAcknowledgedExpired = (): number[] => {
    try {
        const saved = localStorage.getItem('acknowledgedExpiredPlans');
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
};

const isContributionDue = (bucket: LifeXpBucket): boolean => {
    if (!bucket.is_repetitive || !bucket.next_contribution_date || bucket.status !== 'active')
        return false;
    const days = getDaysUntil(bucket.next_contribution_date);
    return days !== null && days <= 7;
};

const calcPlansActionCount = (plans: Plan[]): number => {
    const acknowledgedExpired = getAcknowledgedExpired();
    return plans.filter((p) => {
        if (isExpired(p.expiry_date) && acknowledgedExpired.includes(p.id)) return false;
        return (
            isPremiumDue(p.next_premium_date, p.expiry_date) ||
            (isExpired(p.expiry_date) && !acknowledgedExpired.includes(p.id)) ||
            isExpiringSoon(p.expiry_date)
        );
    }).length;
};

export default function MainLayout() {
    const {
        theme,
        toggleTheme,
        setPlansActionCount,
        setLifeXpActionCount,
        isQuickAddOpen,
        openQuickAdd,
        closeQuickAdd,
        plansActionCount,
        lifeXpActionCount,
    } = useAppStore();

    // Apply saved theme on mount
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    // ⌘K = quick-add, ⌘F = search
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                openQuickAdd();
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
                // Only intercept if not already in an input
                if (
                    document.activeElement?.tagName !== 'INPUT' &&
                    document.activeElement?.tagName !== 'TEXTAREA'
                ) {
                    e.preventDefault();
                    window.location.href = '/search';
                }
            }
            if (e.key === 'Escape') closeQuickAdd();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [openQuickAdd, closeQuickAdd]);

    // TanStack Query: plans badge — refetch every 5 min + on window focus
    const { data: plans } = useQuery({
        queryKey: ['plans-badge'],
        queryFn: fetchPlans,
        refetchInterval: 5 * 60 * 1000,
        refetchOnWindowFocus: true,
    });

    // TanStack Query: life-xp badge
    const { data: lifeXpBuckets } = useQuery({
        queryKey: ['life-xp-badge'],
        queryFn: fetchLifeXpBuckets,
        refetchInterval: 5 * 60 * 1000,
        refetchOnWindowFocus: true,
    });

    // Derive badge counts from query data
    useEffect(() => {
        if (plans) setPlansActionCount(calcPlansActionCount(plans));
    }, [plans, setPlansActionCount]);

    useEffect(() => {
        if (lifeXpBuckets) setLifeXpActionCount(lifeXpBuckets.filter(isContributionDue).length);
    }, [lifeXpBuckets, setLifeXpActionCount]);

    const linkStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        borderRadius: '8px',
        color: 'var(--text-secondary)',
        textDecoration: 'none',
        fontSize: '0.9rem',
        transition: 'all 0.15s ease',
    };

    const activeLinkStyle = {
        ...linkStyle,
        backgroundColor: 'var(--accent-primary)',
        color: '#fff',
        fontWeight: '500',
    };

    const Badge = ({ count, color }: { count: number; color: string }) => (
        <span
            style={{
                minWidth: '18px',
                height: '18px',
                borderRadius: '9px',
                background: color,
                color: 'white',
                fontSize: '0.7rem',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 5px',
            }}
        >
            {count}
        </span>
    );

    return (
        <div
            style={{
                display: 'flex',
                height: '100vh',
                width: '100vw',
                backgroundColor: 'var(--bg-app)',
                transition: 'background-color 0.3s',
            }}
        >
            {/* Sidebar */}
            <nav
                style={{
                    width: '220px',
                    minWidth: '220px',
                    padding: '20px 12px',
                    borderRight: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: 'var(--bg-panel)',
                }}
            >
                {/* Logo + Quick Add shortcut hint */}
                <div
                    style={{
                        padding: '8px 16px 20px',
                        borderBottom: '1px solid var(--border-color)',
                        marginBottom: '16px',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginBottom: '10px',
                        }}
                    >
                        <img src="/logo.svg" alt="" width="28" height="28" />
                        <h1
                            style={{
                                fontSize: '1.25rem',
                                fontWeight: '700',
                                color: 'var(--text-primary)',
                                letterSpacing: '-0.5px',
                                margin: 0,
                            }}
                        >
                            MoneyFlow
                        </h1>
                    </div>
                    <button
                        onClick={openQuickAdd}
                        title="⌘K"
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: 'var(--accent-primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                        }}
                    >
                        <span>+ Add Expense</span>
                        <span
                            style={{ opacity: 0.7, fontSize: '0.75rem', fontFamily: 'monospace' }}
                        >
                            ⌘K
                        </span>
                    </button>
                </div>

                {/* Grouped Navigation */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {navGroups.map((group) => (
                        <div key={group.label} style={{ marginBottom: '16px' }}>
                            <div
                                style={{
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                    color: 'var(--text-secondary)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    padding: '0 16px',
                                    marginBottom: '4px',
                                }}
                            >
                                {group.label}
                            </div>
                            {group.items.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    style={({ isActive }) =>
                                        isActive ? activeLinkStyle : linkStyle
                                    }
                                >
                                    <span>{item.label}</span>
                                    {item.to === '/plans' && plansActionCount > 0 && (
                                        <Badge
                                            count={plansActionCount}
                                            color="var(--accent-danger)"
                                        />
                                    )}
                                    {item.to === '/life-xp' && lifeXpActionCount > 0 && (
                                        <Badge
                                            count={lifeXpActionCount}
                                            color="var(--accent-primary)"
                                        />
                                    )}
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    style={{
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        marginTop: '8px',
                        transition: 'all 0.15s ease',
                    }}
                >
                    {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
                </button>
            </nav>

            {/* Main Content */}
            <main
                style={{
                    flex: 1,
                    padding: '32px 40px',
                    overflowY: 'auto',
                    backgroundColor: 'var(--bg-app)',
                }}
            >
                <Outlet />
            </main>

            {/* Global Quick-Add Modal */}
            {isQuickAddOpen && <QuickAddModal onClose={closeQuickAdd} />}

            {/* Global Toast / Undo */}
            <Toast />
        </div>
    );
}
