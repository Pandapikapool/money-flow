import { Outlet, NavLink } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { fetchPlans, fetchLifeXpBuckets, type Plan, type LifeXpBucket } from "../lib/api";

const navItems = [
    { to: "/overview", label: "Overview" },
    { to: "/daily", label: "Daily" },
    { to: "/expenses", label: "Expenses" },
    { to: "/budget", label: "Budget" },
    { to: "/accounts", label: "Accounts" },
    { to: "/assets", label: "Assets" },
    { to: "/investments", label: "Investments" },
    { to: "/plans", label: "Insurance" },
    { to: "/life-xp", label: "Life XP" },
    { to: "/tags", label: "Tags" },
];

// Helper to check if action needed for plans
const getDaysUntil = (date: string | null): number | null => {
    if (!date) return null;
    const target = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

// Only show premium due notifications for NON-expired plans
const isPremiumDue = (nextPremiumDate: string | null, expiryDate: string | null): boolean => {
    // If plan is expired, no premium notifications
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

// Get acknowledged expired plans from localStorage
const getAcknowledgedExpired = (): number[] => {
    try {
        const saved = localStorage.getItem('acknowledgedExpiredPlans');
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
};

// Life XP helper - check if contribution is due for repetitive buckets
const isContributionDue = (bucket: LifeXpBucket): boolean => {
    if (!bucket.is_repetitive || !bucket.next_contribution_date || bucket.status !== 'active') return false;
    const days = getDaysUntil(bucket.next_contribution_date);
    return days !== null && days <= 7;
};

export default function MainLayout() {
    const [theme, setTheme] = useState<'dark' | 'light'>('light');
    const [plansActionCount, setPlansActionCount] = useState(0);
    const [lifeXpActionCount, setLifeXpActionCount] = useState(0);

    useEffect(() => {
        const saved = localStorage.getItem('theme') as 'dark' | 'light';
        if (saved) setTheme(saved);
        else document.documentElement.setAttribute('data-theme', 'light');
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Fetch plans to check for action needed
    const checkPlans = useCallback(() => {
        fetchPlans()
            .then((plans: Plan[]) => {
                const acknowledgedExpired = getAcknowledgedExpired();
                const actionCount = plans.filter(p => {
                    // If expired and acknowledged, skip
                    if (isExpired(p.expiry_date) && acknowledgedExpired.includes(p.id)) {
                        return false;
                    }
                    // Only count non-expired plans for premium due, or unacknowledged expired/expiring soon
                    return isPremiumDue(p.next_premium_date, p.expiry_date) ||
                        (isExpired(p.expiry_date) && !acknowledgedExpired.includes(p.id)) ||
                        isExpiringSoon(p.expiry_date);
                }).length;
                setPlansActionCount(actionCount);
            })
            .catch(() => setPlansActionCount(0));
    }, []);

    useEffect(() => {
        checkPlans();
        // Refresh every 5 minutes
        const interval = setInterval(checkPlans, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [checkPlans]);

    // Listen for plan updates from PlansPage
    useEffect(() => {
        const handlePlanUpdate = () => {
            checkPlans();
        };
        window.addEventListener('plansUpdated', handlePlanUpdate);
        return () => window.removeEventListener('plansUpdated', handlePlanUpdate);
    }, [checkPlans]);

    // Fetch Life XP buckets to check for action needed (only repetitive ones)
    const checkLifeXp = useCallback(() => {
        fetchLifeXpBuckets()
            .then((buckets: LifeXpBucket[]) => {
                const actionCount = buckets.filter(b => isContributionDue(b)).length;
                setLifeXpActionCount(actionCount);
            })
            .catch(() => setLifeXpActionCount(0));
    }, []);

    useEffect(() => {
        checkLifeXp();
        const interval = setInterval(checkLifeXp, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [checkLifeXp]);

    // Listen for Life XP updates
    useEffect(() => {
        const handleLifeXpUpdate = () => {
            checkLifeXp();
        };
        window.addEventListener('lifeXpUpdated', handleLifeXpUpdate);
        return () => window.removeEventListener('lifeXpUpdated', handleLifeXpUpdate);
    }, [checkLifeXp]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const linkStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderRadius: '8px',
        color: 'var(--text-secondary)',
        textDecoration: 'none',
        fontSize: '0.95rem',
        transition: 'all 0.15s ease',
    };

    const activeLinkStyle = {
        ...linkStyle,
        backgroundColor: 'var(--accent-primary)',
        color: '#fff',
        fontWeight: '500',
    };

    return (
        <div style={{
            display: 'flex',
            height: '100vh',
            width: '100vw',
            backgroundColor: 'var(--bg-app)',
            transition: 'background-color 0.3s'
        }}>
            {/* Sidebar */}
            <nav style={{
                width: '220px',
                minWidth: '220px',
                padding: '20px 12px',
                borderRight: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--bg-panel)',
            }}>
                {/* Logo */}
                <div style={{
                    padding: '8px 16px 24px',
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: '16px'
                }}>
                    <h1 style={{
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.5px'
                    }}>
                        MoneyFlow
                    </h1>
                </div>

                {/* Navigation */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}
                        >
                            <span>{item.label}</span>
                            {item.to === '/plans' && plansActionCount > 0 && (
                                <span style={{
                                    minWidth: '18px',
                                    height: '18px',
                                    borderRadius: '9px',
                                    background: 'var(--accent-danger)',
                                    color: 'white',
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0 5px',
                                }}>
                                    {plansActionCount}
                                </span>
                            )}
                            {item.to === '/life-xp' && lifeXpActionCount > 0 && (
                                <span style={{
                                    minWidth: '18px',
                                    height: '18px',
                                    borderRadius: '9px',
                                    background: 'var(--accent-primary)',
                                    color: 'white',
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0 5px',
                                }}>
                                    {lifeXpActionCount}
                                </span>
                            )}
                        </NavLink>
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
                        marginTop: '16px',
                        transition: 'all 0.15s ease',
                    }}
                >
                    {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
                </button>
            </nav>

            {/* Main Content */}
            <main style={{
                flex: 1,
                padding: '32px 40px',
                overflowY: 'auto',
                backgroundColor: 'var(--bg-app)'
            }}>
                <Outlet />
            </main>
        </div>
    );
}
