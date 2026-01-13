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
    fetchExpenses, fetchTags,
    type DashboardSummary, type MonthlyAggregate, type FixedReturnsSummary,
    type SIPSummary, type RDSummary, type StocksSummary, type Expense, type Tag
} from "../lib/api";
import { formatCurrency } from "../lib/format";

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

                // Fetch expenses for all months of the selected year
                const allExpensesPromises = Array.from({ length: 12 }, (_, i) => 
                    fetchExpenses(selectedYear, i + 1).catch(() => [] as Expense[])
                );
                const expensesArrays = await Promise.all(allExpensesPromises);
                const allExpenses = expensesArrays.flat();
                setAllExpensesData(allExpenses);

                // Group expenses by category (tag) - only regular tags, not special tags
                const categoryTotals: Record<string, number> = {};
                allExpenses.forEach(expense => {
                    const tag = tagsData.find(t => t.id === expense.tag_id);
                    const tagName = tag?.name || 'Unknown';
                    categoryTotals[tagName] = (categoryTotals[tagName] || 0) + Number(expense.amount);
                });
                setExpensesByCategory(categoryTotals);
                setSelectedMonths([]); // Reset to all months when year changes

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

    // Filter expenses by selected months
    const filteredExpenses = selectedMonths.length === 0
        ? allExpensesData
        : allExpensesData.filter(expense => {
            const expenseMonth = new Date(expense.date).getMonth() + 1;
            return selectedMonths.includes(expenseMonth);
        });

    // Recalculate category totals based on filtered expenses
    const filteredCategoryTotals: Record<string, number> = {};
    filteredExpenses.forEach(expense => {
        const tag = tags.find(t => t.id === expense.tag_id);
        const tagName = tag?.name || 'Unknown';
        filteredCategoryTotals[tagName] = (filteredCategoryTotals[tagName] || 0) + Number(expense.amount);
    });

    // Use filtered totals if months are selected, otherwise use all
    const displayCategoryTotals = selectedMonths.length > 0 ? filteredCategoryTotals : expensesByCategory;

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
                                        const monthNum = i + 1;
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
                </div>
            </div>
        </div>
    );
}
