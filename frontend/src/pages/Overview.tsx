import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import {
    fetchDashboardSummary, getYearSummary,
    fetchFixedReturnsSummary, fetchSIPSummary, fetchRDSummary,
    fetchStocksSummary, fetchAccounts, fetchLifeXpBuckets,
    fetchExpenses, fetchTags, fetchSpecialTags, getExpenseSpecialTags,
    type DashboardSummary, type MonthlyAggregate, type FixedReturnsSummary,
    type SIPSummary, type RDSummary, type StocksSummary, type Expense, type Tag, type SpecialTag
} from "../lib/api";
import { formatCurrency } from "../lib/format";
import { exportYearData } from "../lib/export";

const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4'];

export default function Overview() {
    const currentYear = new Date().getFullYear();

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
    const [monthlyData, setMonthlyData] = useState<MonthlyAggregate[]>([]);
    const [fixedSummary, setFixedSummary] = useState<FixedReturnsSummary | null>(null);
    const [sipSummary, setSipSummary] = useState<SIPSummary | null>(null);
    const [rdSummary, setRDSummary] = useState<RDSummary | null>(null);
    const [indianStocks, setIndianStocks] = useState<StocksSummary | null>(null);
    const [usStocks, setUsStocks] = useState<StocksSummary | null>(null);
    const [cryptoStocks, setCryptoStocks] = useState<StocksSummary | null>(null);
    const [accountsTotal, setAccountsTotal] = useState(0);
    const [lifeXpTotal, setLifeXpTotal] = useState({ saved: 0, target: 0 });
    const [expensesByCategory, setExpensesByCategory] = useState<Record<string, number>>({});
    const [selectedMonths, setSelectedMonths] = useState<number[]>([]); // Empty = all months
    const [allExpensesData, setAllExpensesData] = useState<Expense[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [specialTags, setSpecialTags] = useState<SpecialTag[]>([]);
    const [expenseSpecialTagsMap, setExpenseSpecialTagsMap] = useState<Record<number, number[]>>({});
    const [selectedHeatmapMonth, setSelectedHeatmapMonth] = useState<number | null>(null); // null = show weekly, number = show daily for that month
    const [excludedSpecialTagIds, setExcludedSpecialTagIds] = useState<Set<number>>(new Set()); // Set of special tag IDs to exclude
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        const loadAll = async () => {
            setLoading(true);
            try {
                // Year-specific data
                const yearData = await getYearSummary(selectedYear);
                setMonthlyData(yearData);

                // Fetch tags first (needed for grouping)
                const tagsData = await fetchTags().catch(() => [] as Tag[]);
                setTags(tagsData);

                // Fetch special tags
                const specialTagsData = await fetchSpecialTags().catch(() => [] as SpecialTag[]);
                setSpecialTags(specialTagsData);

                // Fetch expenses for all months of the selected year
                const allExpensesPromises = Array.from({ length: 12 }, (_, i) => 
                    fetchExpenses(selectedYear, i + 1).catch(() => [] as Expense[])
                );
                const expensesArrays = await Promise.all(allExpensesPromises);
                const allExpenses = expensesArrays.flat();
                setAllExpensesData(allExpenses);

                // Fetch special tags for all expenses
                const specialTagsMap: Record<number, number[]> = {};
                await Promise.all(
                    allExpenses.map(async (expense) => {
                        try {
                            const specialTagIds = await getExpenseSpecialTags(expense.id);
                            specialTagsMap[expense.id] = specialTagIds;
                        } catch (err) {
                            console.error(`Failed to fetch special tags for expense ${expense.id}:`, err);
                            specialTagsMap[expense.id] = [];
                        }
                    })
                );
                setExpenseSpecialTagsMap(specialTagsMap);

                // Group expenses by category (tag) - only regular tags, not special tags
                const categoryTotals: Record<string, number> = {};
                allExpenses.forEach(expense => {
                    const tag = tagsData.find(t => t.id === expense.tag_id);
                    const tagName = tag?.name || 'Unknown';
                    categoryTotals[tagName] = (categoryTotals[tagName] || 0) + Number(expense.amount);
                });
                setExpensesByCategory(categoryTotals);
                setSelectedMonths([]); // Reset to all months when year changes
                setSelectedHeatmapMonth(null); // Reset heatmap view when year changes
                // Keep excluded tags when year changes for better UX

                // Current state data (not year-specific)
                const [dashData, fixedData, sipData, rdData, indStocks, usStocksData, cryptoStocksData, accounts, lifeXp] = await Promise.all([
                    fetchDashboardSummary(),
                    fetchFixedReturnsSummary().catch(() => null),
                    fetchSIPSummary().catch(() => null),
                    fetchRDSummary().catch(() => null),
                    fetchStocksSummary('indian').catch(() => null),
                    fetchStocksSummary('us').catch(() => null),
                    fetchStocksSummary('crypto').catch(() => null),
                    fetchAccounts().catch(() => []),
                    fetchLifeXpBuckets().catch(() => [])
                ]);

                setDashboard(dashData);
                setFixedSummary(fixedData);
                setSipSummary(sipData);
                setRDSummary(rdData);
                setIndianStocks(indStocks);
                setUsStocks(usStocksData);
                setCryptoStocks(cryptoStocksData);
                setAccountsTotal(accounts.reduce((sum, a) => sum + Number(a.balance), 0));
                setLifeXpTotal({
                    saved: lifeXp.filter(b => b.status === 'active').reduce((sum, b) => sum + Number(b.saved_amount), 0),
                    target: lifeXp.filter(b => b.status === 'active').reduce((sum, b) => sum + Number(b.target_amount), 0)
                });
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadAll();
    }, [selectedYear]);

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

    // Calculate totals
    const yearlySpent = monthlyData.reduce((sum, m) => sum + m.spent, 0);
    const yearlyBudget = monthlyData.reduce((sum, m) => sum + m.budget, 0);
    const isCurrentYear = selectedYear === currentYear;

    // Investment totals (INR)
    const totalInvestedINR =
        (fixedSummary?.total_invested || 0) +
        (sipSummary?.total_invested || 0) +
        (rdSummary?.total_invested || 0) +
        (indianStocks?.total_invested || 0);

    // USD invested (US Stocks + Crypto)
    const totalInvestedUSD = (usStocks?.total_invested || 0) + (cryptoStocks?.total_invested || 0);

    // Total invested (INR + USD shown separately)
    const totalInvested = totalInvestedINR + totalInvestedUSD;

    const totalCurrentValue =
        (fixedSummary?.total_invested || 0) + // FD doesn't have current value in summary
        (sipSummary?.current_value || 0) +
        (rdSummary?.total_invested || 0) + // RD maturity is future
        (indianStocks?.current_value || 0) +
        (usStocks?.current_value || 0) +
        (cryptoStocks?.current_value || 0);

    // Net worth calculation
    const netWorth = accountsTotal + (dashboard?.assets || 0) + totalCurrentValue + lifeXpTotal.saved;

    // Filter expenses for category chart (apply both month filter and special tag filter)
    const filteredExpensesForCategory = allExpensesData.filter(expense => {
        // Apply month filter
        if (selectedMonths.length > 0) {
            const expenseMonth = new Date(expense.date).getMonth() + 1;
            if (!selectedMonths.includes(expenseMonth)) return false;
        }
        // Apply special tag filter
        if (excludedSpecialTagIds.size > 0) {
            const expenseSpecialTagIds = expenseSpecialTagsMap[expense.id] || [];
            if (expenseSpecialTagIds.some(tagId => excludedSpecialTagIds.has(tagId))) return false;
        }
        return true;
    });

    // Recalculate category totals based on filtered expenses
    const filteredCategoryTotals: Record<string, number> = {};
    filteredExpensesForCategory.forEach(expense => {
        const tag = tags.find(t => t.id === expense.tag_id);
        const tagName = tag?.name || 'Unknown';
        filteredCategoryTotals[tagName] = (filteredCategoryTotals[tagName] || 0) + Number(expense.amount);
    });

    // Use filtered totals if months or tags are selected, otherwise use all
    const displayCategoryTotals = (selectedMonths.length > 0 || excludedSpecialTagIds.size > 0) 
        ? filteredCategoryTotals 
        : expensesByCategory;

    // Helper function to get week number (1-52) from a date
    const getWeekNumber = (date: Date): number => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };

    // Filter expenses based on excluded special tags
    const filteredExpensesForHeatmap = allExpensesData.filter(expense => {
        if (excludedSpecialTagIds.size === 0) return true; // No tags excluded, include all
        const expenseSpecialTagIds = expenseSpecialTagsMap[expense.id] || [];
        // Exclude expense if it has any of the excluded special tags
        return !expenseSpecialTagIds.some(tagId => excludedSpecialTagIds.has(tagId));
    });

    // Helper to toggle special tag exclusion
    const toggleSpecialTagExclusion = (tagId: number) => {
        setExcludedSpecialTagIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tagId)) {
                newSet.delete(tagId);
            } else {
                newSet.add(tagId);
            }
            return newSet;
        });
    };

    // Get description text for excluded tags
    const getExcludedTagsDescription = () => {
        if (excludedSpecialTagIds.size === 0) return '';
        const excludedTagNames = specialTags
            .filter(st => excludedSpecialTagIds.has(st.id))
            .map(st => st.name)
            .join(', ');
        return `(excluding: ${excludedTagNames})`;
    };

    // Weekday-wise expenses (Sunday to Saturday, accumulated over the year)
    const weekdayExpenseMap: Record<number, number> = {}; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    filteredExpensesForHeatmap.forEach(expense => {
        const expenseDate = new Date(expense.date);
        const dayOfWeek = expenseDate.getDay(); // 0 = Sunday, 6 = Saturday
        weekdayExpenseMap[dayOfWeek] = (weekdayExpenseMap[dayOfWeek] || 0) + Number(expense.amount);
    });

    // Weekday bar chart data (Sunday to Saturday)
    const weekdayChartData = [
        { name: 'Sun', day: 0, amount: weekdayExpenseMap[0] || 0 },
        { name: 'Mon', day: 1, amount: weekdayExpenseMap[1] || 0 },
        { name: 'Tue', day: 2, amount: weekdayExpenseMap[2] || 0 },
        { name: 'Wed', day: 3, amount: weekdayExpenseMap[3] || 0 },
        { name: 'Thu', day: 4, amount: weekdayExpenseMap[4] || 0 },
        { name: 'Fri', day: 5, amount: weekdayExpenseMap[5] || 0 },
        { name: 'Sat', day: 6, amount: weekdayExpenseMap[6] || 0 },
    ];

    // Weekly Heatmap: Week of year (1-52) with expense totals
    const weekExpenseMap: Record<number, number> = {};
    const weekMonthMap: Record<number, number> = {}; // Track which month each week belongs to
    filteredExpensesForHeatmap.forEach(expense => {
        const expenseDate = new Date(expense.date);
        const weekNum = getWeekNumber(expenseDate);
        weekExpenseMap[weekNum] = (weekExpenseMap[weekNum] || 0) + Number(expense.amount);
        // Store the month for this week (use the month of the first expense in that week)
        if (!weekMonthMap[weekNum]) {
            weekMonthMap[weekNum] = expenseDate.getMonth() + 1;
        }
    });

    // Calculate month boundaries in weeks (for dividers)
    const monthWeekBoundaries: Array<{ month: number; startWeek: number; endWeek: number }> = [];
    const monthWeekRanges: Record<number, { startWeek: number; endWeek: number }> = {};
    
    // Group weeks by month
    for (let month = 1; month <= 12; month++) {
        const weeksInMonth: number[] = [];
        for (let week = 1; week <= 52; week++) {
            if (weekMonthMap[week] === month) {
                weeksInMonth.push(week);
            }
        }
        if (weeksInMonth.length > 0) {
            const startWeek = Math.min(...weeksInMonth);
            const endWeek = Math.max(...weeksInMonth);
            monthWeekRanges[month] = { startWeek, endWeek };
            monthWeekBoundaries.push({ month, startWeek, endWeek });
        }
    }

    // Daily expense map for selected month
    const dailyExpenseMap: Record<string, number> = {};
    if (selectedHeatmapMonth !== null) {
        filteredExpensesForHeatmap.forEach(expense => {
            const expenseDate = new Date(expense.date);
            if (expenseDate.getMonth() + 1 === selectedHeatmapMonth && expenseDate.getFullYear() === selectedYear) {
                // Normalize date to YYYY-MM-DD format
                const year = expenseDate.getFullYear();
                const month = String(expenseDate.getMonth() + 1).padStart(2, '0');
                const day = String(expenseDate.getDate()).padStart(2, '0');
                const dateKey = `${year}-${month}-${day}`;
                dailyExpenseMap[dateKey] = (dailyExpenseMap[dateKey] || 0) + Number(expense.amount);
            }
        });
    }

    // Generate daily calendar data for selected month
    const generateDailyCalendarData = (month: number) => {
        const daysInMonth = new Date(selectedYear, month, 0).getDate();
        const days: Array<{ day: number; amount: number; date: string }> = [];
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${selectedYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            days.push({
                day,
                amount: dailyExpenseMap[dateStr] || 0,
                date: dateStr
            });
        }
        
        return days;
    };

    const dailyCalendarData = selectedHeatmapMonth !== null ? generateDailyCalendarData(selectedHeatmapMonth) : [];

    // Get max values for heatmap intensity
    const maxWeekExpense = Math.max(...Object.values(weekExpenseMap), 0);
    const maxDailyExpense = selectedHeatmapMonth !== null ? Math.max(...Object.values(dailyExpenseMap), 0) : 0;

    // Helper to get heatmap color intensity
    const getHeatmapColor = (value: number, max: number): string => {
        if (max === 0) return 'var(--bg-panel)';
        const intensity = value / max;
        if (intensity === 0) return 'var(--bg-panel)';
        if (intensity < 0.2) return 'rgba(59, 130, 246, 0.2)'; // Light blue
        if (intensity < 0.4) return 'rgba(59, 130, 246, 0.4)';
        if (intensity < 0.6) return 'rgba(59, 130, 246, 0.6)';
        if (intensity < 0.8) return 'rgba(59, 130, 246, 0.8)';
        return 'rgba(59, 130, 246, 1)'; // Dark blue
    };

    // Chart data
    const monthlyChartData = monthlyData.map(m => ({
        name: new Date(0, m.month - 1).toLocaleString('default', { month: 'short' }),
        spent: m.spent,
        budget: m.budget
    }));

    const investmentPieData = [
        { name: 'Fixed Returns', value: fixedSummary?.total_invested || 0 },
        { name: 'SIPs', value: sipSummary?.total_invested || 0 },
        { name: 'RDs', value: rdSummary?.total_invested || 0 },
        { name: 'Indian Stocks', value: indianStocks?.total_invested || 0 },
        { name: 'US Stocks', value: usStocks?.total_invested || 0 },
        { name: 'Crypto', value: cryptoStocks?.total_invested || 0 },
    ].filter(d => d.value > 0);

    const wealthPieData = [
        { name: 'Cash (Accounts)', value: accountsTotal },
        { name: 'Assets', value: dashboard?.assets || 0 },
        { name: 'Investments', value: totalCurrentValue },
        { name: 'Life XP Savings', value: lifeXpTotal.saved },
    ].filter(d => d.value > 0);

    // Summary tiles
    const tiles = [
        {
            title: "Net Worth",
            value: netWorth,
            color: 'var(--accent-primary)',
            subtitle: "Total wealth (current)"
        },
        {
            title: `${selectedYear} Yearly Expenses`,
            value: yearlySpent,
            link: `/expenses/${selectedYear}`,
            color: yearlySpent > yearlyBudget && yearlyBudget > 0 ? 'var(--accent-danger)' : 'var(--accent-success)',
            subtitle: yearlyBudget > 0 ? `of ${formatCurrency(yearlyBudget)} budget` : 'No budget set'
        },
        {
            title: "Investments",
            value: totalCurrentValue,
            link: "/investments",
            color: '#2196f3',
            subtitle: totalInvestedUSD > 0 
                ? `${formatCurrency(totalInvestedINR)} invested (INR) + $${totalInvestedUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} invested (USD)`
                : `${formatCurrency(totalInvested)} invested`
        },
        {
            title: "Accounts",
            value: accountsTotal,
            link: "/accounts",
            color: '#4caf50',
            subtitle: "Liquid cash (current)"
        },
        {
            title: "Assets",
            value: dashboard?.assets || 0,
            link: "/assets",
            color: '#ff9800',
            subtitle: "Properties & more"
        },
        {
            title: "Life XP",
            value: lifeXpTotal.saved,
            link: "/life-xp",
            color: '#9c27b0',
            subtitle: `of ${formatCurrency(lifeXpTotal.target)} target`
        },
    ];

    return (
        <div style={{ maxWidth: '1400px' }}>
            {/* Header with Year Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h1 style={{ margin: 0 }}>Overview</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={() => setSelectedYear(y => y - 1)}
                        style={{
                            background: 'var(--bg-panel)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >
                        &larr; {selectedYear - 1}
                    </button>
                    <span style={{
                        fontSize: '1.2rem',
                        fontWeight: '600',
                        padding: '8px 16px',
                        background: isCurrentYear ? 'var(--accent-primary)' : 'var(--bg-panel)',
                        color: isCurrentYear ? '#fff' : 'var(--text-primary)',
                        borderRadius: '6px'
                    }}>
                        {selectedYear}
                    </span>
                    <button
                        onClick={() => setSelectedYear(y => y + 1)}
                        style={{
                            background: 'var(--bg-panel)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >
                        {selectedYear + 1} &rarr;
                    </button>
                </div>
            </div>

            {/* Summary Tiles */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '40px'
            }}>
                {tiles.map((tile, i) => (
                    <Link
                        key={i}
                        to={tile.link || '#'}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                        <div
                            className="glass-panel"
                            style={{
                                padding: '20px',
                                cursor: tile.link ? 'pointer' : 'default',
                                transition: 'transform 0.15s',
                                borderLeft: `4px solid ${tile.color}`
                            }}
                            onMouseEnter={e => tile.link && (e.currentTarget.style.transform = 'translateY(-2px)')}
                            onMouseLeave={e => tile.link && (e.currentTarget.style.transform = 'translateY(0)')}
                        >
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                {tile.title}
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '4px' }}>
                                {formatCurrency(tile.value)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {tile.subtitle}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>

                {/* Monthly Expenses vs Budget Chart */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '1rem', color: 'var(--text-secondary)' }}>
                        {selectedYear} Monthly Expenses vs Budget
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={monthlyChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                            <Tooltip
                                contentStyle={{
                                    background: 'var(--bg-panel)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px'
                                }}
                                formatter={(value) => formatCurrency(Number(value))}
                            />
                            <Legend />
                            <Bar dataKey="spent" name="Spent" fill="#f44336" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="budget" name="Budget" fill="#4caf50" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                    <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Year Total: {formatCurrency(yearlySpent)} spent of {formatCurrency(yearlyBudget)} budget
                        <span style={{
                            marginLeft: '12px',
                            color: yearlySpent > yearlyBudget ? 'var(--accent-danger)' : 'var(--accent-success)',
                            fontWeight: '600'
                        }}>
                            ({yearlySpent > yearlyBudget ? 'Over' : 'Under'} by {formatCurrency(Math.abs(yearlyBudget - yearlySpent))})
                        </span>
                    </div>
                </div>

                {/* Wealth Distribution Pie Chart */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '1rem', color: 'var(--text-secondary)' }}>
                        Wealth Distribution
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={wealthPieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={2}
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                labelLine={false}
                            >
                                {wealthPieData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    background: 'var(--bg-panel)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px'
                                }}
                                formatter={(value) => formatCurrency(Number(value))}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>
                            Total: {formatCurrency(netWorth)}
                        </span>
                    </div>
                </div>

                {/* Investment Breakdown Pie Chart */}
                {investmentPieData.length > 0 && (
                    <div className="glass-panel" style={{ padding: '24px' }}>
                        <h3 style={{ marginBottom: '20px', fontSize: '1rem', color: 'var(--text-secondary)' }}>
                            Investment Breakdown
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={investmentPieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    {investmentPieData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--bg-panel)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px'
                                    }}
                                    formatter={(value) => formatCurrency(Number(value))}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.85rem' }}>
                            <div style={{ fontWeight: '600', color: '#2196f3', marginBottom: '4px' }}>
                                Total Invested: {formatCurrency(totalInvestedINR)}
                                {totalInvestedUSD > 0 && (
                                    <span style={{ marginLeft: '8px' }}>
                                        + ${totalInvestedUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (USD)
                            </span>
                                )}
                            </div>
                            {totalInvestedUSD > 0 && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    USD: US Stocks + Crypto
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Expense Distribution by Category */}
                {Object.keys(expensesByCategory).length > 0 && (
                    <div className="glass-panel" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>
                                {selectedYear} Expense Distribution by Category
                            </h3>
                            {excludedSpecialTagIds.size > 0 && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    {getExcludedTagsDescription()}
                                </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Filter by Month:
                                </label>
                                <select
                                    value={selectedMonths.length === 0 ? 'all' : selectedMonths.join(',')}
                                    onChange={(e) => {
                                        if (e.target.value === 'all') {
                                            setSelectedMonths([]);
                                        } else {
                                            const months = e.target.value.split(',').map(m => parseInt(m));
                                            setSelectedMonths(months);
                                        }
                                    }}
                                    style={{
                                        padding: '6px 12px',
                                        background: 'var(--bg-app)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '6px',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="all">All Months</option>
                                    {Array.from({ length: 12 }, (_, i) => {
                                        const monthNum = i + 1;
                                        const monthName = new Date(0, i).toLocaleString('default', { month: 'long' });
                                        return (
                                            <option key={monthNum} value={monthNum.toString()}>
                                                {monthName}
                                            </option>
                                        );
                                    })}
                                    {Array.from({ length: 12 }, (_, i) => {
                                        const monthName = new Date(0, i).toLocaleString('default', { month: 'long' });
                                        // Create range options (e.g., "Jan-Mar", "Apr-Jun", etc.)
                                        if (i % 3 === 0) {
                                            const endMonth = Math.min(i + 3, 12);
                                            const endMonthName = new Date(0, endMonth - 1).toLocaleString('default', { month: 'long' });
                                            const rangeMonths = Array.from({ length: endMonth - i }, (_, j) => i + j + 1);
                                            return (
                                                <option key={`range-${i}`} value={rangeMonths.join(',')}>
                                                    {monthName} - {endMonthName}
                                                </option>
                                            );
                                        }
                                        return null;
                                    })}
                                </select>
                            </div>
                        </div>
                        {Object.keys(displayCategoryTotals).length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={Object.entries(displayCategoryTotals)
                                                .map(([name, value]) => ({ name, value }))
                                                .sort((a, b) => b.value - a.value)}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={2}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                            labelLine={false}
                                        >
                                            {Object.entries(displayCategoryTotals)
                                                .map(([name, value]) => ({ name, value }))
                                                .sort((a, b) => b.value - a.value)
                                                .map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                background: 'var(--bg-panel)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '8px'
                                            }}
                                            formatter={(value) => formatCurrency(Number(value))}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.85rem' }}>
                                    <span style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>
                                        Total: {formatCurrency(Object.values(displayCategoryTotals).reduce((sum, val) => sum + val, 0))}
                                    </span>
                                    {selectedMonths.length > 0 && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                            {selectedMonths.map(m => new Date(0, m - 1).toLocaleString('default', { month: 'short' })).join(', ')}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                No expenses found for selected months
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Common Expense Filters Section */}
            {specialTags.length > 0 && (
                <div className="glass-panel" style={{ padding: '20px', marginTop: '24px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', minWidth: '140px' }}>
                            Filter Expenses:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                Exclude Special Tags (affects all expense charts below):
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {specialTags.map(tag => (
                                    <label
                                        key={tag.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            color: 'var(--text-secondary)',
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            background: excludedSpecialTagIds.has(tag.id) 
                                                ? 'rgba(239, 68, 68, 0.15)' 
                                                : 'var(--bg-app)',
                                            border: `1px solid ${excludedSpecialTagIds.has(tag.id) ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-color)'}`,
                                            transition: 'all 0.2s',
                                            fontWeight: excludedSpecialTagIds.has(tag.id) ? '500' : '400'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={excludedSpecialTagIds.has(tag.id)}
                                            onChange={() => toggleSpecialTagExclusion(tag.id)}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        <span>{tag.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Expense Heatmaps Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                
                {/* Weekday Bar Chart (Sunday to Saturday) */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '1rem', color: 'var(--text-secondary)' }}>
                        {selectedYear} Expense by Weekday
                    </h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        Accumulated expenses by day of week {getExcludedTagsDescription()}
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={weekdayChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis 
                                dataKey="name" 
                                tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                            />
                            <YAxis 
                                tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                                tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: 'var(--bg-panel)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px'
                                }}
                                formatter={(value) => formatCurrency(Number(value))}
                            />
                            <Bar 
                                dataKey="amount" 
                                fill="#3b82f6" 
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                    <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <span style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>
                            Total: {formatCurrency(weekdayChartData.reduce((sum, w) => sum + w.amount, 0))}
                        </span>
                    </div>
                </div>

                {/* Weekly/Daily Heatmap */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>
                            {selectedHeatmapMonth !== null 
                                ? `${selectedYear} ${new Date(0, selectedHeatmapMonth - 1).toLocaleString('default', { month: 'long' })} Daily Expense Heatmap`
                                : `${selectedYear} Weekly Expense Heatmap`
                            }
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                View:
                            </label>
                            <select
                                value={selectedHeatmapMonth === null ? 'all' : selectedHeatmapMonth.toString()}
                                onChange={(e) => {
                                    if (e.target.value === 'all') {
                                        setSelectedHeatmapMonth(null);
                                    } else {
                                        setSelectedHeatmapMonth(parseInt(e.target.value));
                                    }
                                }}
                                style={{
                                    padding: '6px 12px',
                                    background: 'var(--bg-app)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="all">All Weeks (1-52)</option>
                                {Array.from({ length: 12 }, (_, i) => {
                                    const monthNum = i + 1;
                                    const monthName = new Date(0, i).toLocaleString('default', { month: 'long' });
                                    return (
                                        <option key={monthNum} value={monthNum.toString()}>
                                            {monthName} (Daily)
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        {selectedHeatmapMonth !== null 
                            ? `Daily expenses for ${new Date(0, selectedHeatmapMonth - 1).toLocaleString('default', { month: 'long' })} ${getExcludedTagsDescription()}`
                            : `Week 1-52 of the year ${getExcludedTagsDescription()}`
                        }
                    </div>

                    {selectedHeatmapMonth === null ? (
                        <>
                            {/* Weekly Heatmap */}
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(13, 1fr)', 
                                gap: '4px',
                                fontSize: '0.7rem',
                                position: 'relative'
                            }}>
                                {Array.from({ length: 52 }, (_, i) => {
                                    const weekNum = i + 1;
                                    const amount = weekExpenseMap[weekNum] || 0;
                                    const month = weekMonthMap[weekNum] || 1;
                                    
                                    // Check if this is the start of a new month (first week of month)
                                    const isMonthStart = monthWeekRanges[month]?.startWeek === weekNum;
                                    
                                    return (
                                        <div key={weekNum} style={{ position: 'relative' }}>
                                            {isMonthStart && weekNum > 1 && (
                                                <div style={{
                                                    position: 'absolute',
                                                    left: '-2px',
                                                    top: '0',
                                                    bottom: '0',
                                                    width: '2px',
                                                    background: 'var(--accent-primary)',
                                                    zIndex: 10,
                                                    borderRadius: '1px'
                                                }} />
                                            )}
                                            <div
                                                title={`Week ${weekNum} (${new Date(0, month - 1).toLocaleString('default', { month: 'short' })}): ${formatCurrency(amount)}`}
                                                style={{
                                                    aspectRatio: '1',
                                                    background: getHeatmapColor(amount, maxWeekExpense),
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '4px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.65rem',
                                                    color: amount > 0 ? '#fff' : 'var(--text-secondary)',
                                                    cursor: amount > 0 ? 'pointer' : 'default',
                                                    fontWeight: amount > 0 ? '600' : '400'
                                                }}
                                            >
                                                {weekNum}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Month indicators below the heatmap */}
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(13, 1fr)', 
                                gap: '4px',
                                marginTop: '8px',
                                fontSize: '0.65rem',
                                color: 'var(--text-secondary)'
                            }}>
                                {Array.from({ length: 52 }, (_, i) => {
                                    const weekNum = i + 1;
                                    const month = weekMonthMap[weekNum] || 1;
                                    const isMonthStart = monthWeekRanges[month]?.startWeek === weekNum;
                                    
                                    return (
                                        <div key={weekNum} style={{ textAlign: 'center', height: '16px' }}>
                                            {isMonthStart && (
                                                <span style={{ 
                                                    fontSize: '0.6rem',
                                                    color: 'var(--accent-primary)',
                                                    fontWeight: '600'
                                                }}>
                                                    {new Date(0, month - 1).toLocaleString('default', { month: 'short' })}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Daily Calendar Heatmap */}
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(7, 1fr)', 
                                gap: '4px',
                                fontSize: '0.7rem'
                            }}>
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <div key={day} style={{ 
                                        textAlign: 'center', 
                                        padding: '4px',
                                        color: 'var(--text-secondary)',
                                        fontWeight: '600'
                                    }}>
                                        {day}
                                    </div>
                                ))}
                                {/* Empty cells for days before the first day of month */}
                                {Array.from({ length: new Date(selectedYear, selectedHeatmapMonth - 1, 1).getDay() }, (_, i) => (
                                    <div key={`empty-${i}`} />
                                ))}
                                {dailyCalendarData.map(({ day, amount, date }) => (
                                    <div
                                        key={day}
                                        title={`${date}: ${formatCurrency(amount)}`}
                                        style={{
                                            aspectRatio: '1',
                                            background: getHeatmapColor(amount, maxDailyExpense),
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.7rem',
                                            color: amount > 0 ? '#fff' : 'var(--text-secondary)',
                                            cursor: amount > 0 ? 'pointer' : 'default',
                                            fontWeight: amount > 0 ? '600' : '400'
                                        }}
                                    >
                                        {day}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        marginTop: '16px',
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)'
                    }}>
                        <span>Less</span>
                        <div style={{ display: 'flex', gap: '2px' }}>
                            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((intensity, i) => (
                                <div
                                    key={i}
                                    style={{
                                        width: '20px',
                                        height: '20px',
                                        background: intensity === 0 
                                            ? 'var(--bg-panel)' 
                                            : `rgba(59, 130, 246, ${intensity})`,
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '4px'
                                    }}
                                />
                            ))}
                        </div>
                        <span>More</span>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="glass-panel" style={{ padding: '24px', marginTop: '24px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '1rem', color: 'var(--text-secondary)' }}>
                    Quick Actions
                </h3>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <Link to="/daily" style={{
                        padding: '10px 20px',
                        background: 'var(--accent-primary)',
                        color: '#fff',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                    }}>
                        + Add Expense
                    </Link>
                    <Link to="/budget" style={{
                        padding: '10px 20px',
                        background: 'var(--bg-panel)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontSize: '0.9rem'
                    }}>
                        Set Budget
                    </Link>
                    <Link to="/investments" style={{
                        padding: '10px 20px',
                        background: 'var(--bg-panel)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontSize: '0.9rem'
                    }}>
                        View Investments
                    </Link>
                    <Link to={`/expenses/${selectedYear}`} style={{
                        padding: '10px 20px',
                        background: 'var(--bg-panel)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontSize: '0.9rem'
                    }}>
                        {selectedYear} Expenses
                    </Link>
                    <button
                        onClick={async () => {
                            const yearInput = prompt(`Enter year to export (default: ${selectedYear}):`, selectedYear.toString());
                            if (!yearInput) return;
                            
                            const year = parseInt(yearInput, 10);
                            if (isNaN(year) || year < 2000 || year > 2100) {
                                alert('Please enter a valid year');
                                return;
                            }

                            setExporting(true);
                            try {
                                await exportYearData(year);
                                alert(`Export completed! File: money-flow-export-${year}.xlsx`);
                            } catch (error) {
                                console.error('Export failed:', error);
                                alert('Export failed. Please check the console for details.');
                            } finally {
                                setExporting(false);
                            }
                        }}
                        disabled={exporting}
                        style={{
                            padding: '10px 20px',
                            background: exporting ? 'var(--text-secondary)' : 'var(--accent-success)',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            cursor: exporting ? 'not-allowed' : 'pointer',
                            opacity: exporting ? 0.6 : 1
                        }}
                    >
                        {exporting ? 'Exporting...' : '📥 Export Data'}
                    </button>
                </div>
            </div>
        </div>
    );
}
