import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { type PlanHistory } from '../lib/api';
import { SETTINGS } from '../lib/settings';

interface Props {
    data: PlanHistory[];
    onPointClick: (entry: PlanHistory) => void;
}

export default function PlanHistoryGraph({ data, onPointClick }: Props) {
    if (!data || data.length === 0) return <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>No history data</div>;

    // Sort data by date and calculate cumulative premium paid
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let cumulativePremium = 0;
    const chartData = sortedData.map(entry => {
        cumulativePremium += entry.premium_amount;
        return {
            ...entry,
            cumulative_premium: cumulativePremium
        };
    });

    return (
        <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
            <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis
                        dataKey="date"
                        tickFormatter={(date) => {
                            const d = new Date(date);
                            return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                        stroke="var(--text-secondary)"
                        fontSize={12}
                    />
                    <YAxis
                        stroke="var(--text-secondary)"
                        fontSize={12}
                        tickFormatter={(val) => `${SETTINGS.CURRENCY}${(val / 100000).toFixed(0)}L`}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                        formatter={(value: any, name?: string) => [
                            `${SETTINGS.CURRENCY}${Number(value).toLocaleString()}`,
                            'Total Premium Paid'
                        ]}
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="cumulative_premium"
                        name="Total Premium Paid"
                        stroke="var(--accent-warning)"
                        strokeWidth={2}
                        dot={{ r: 4, fill: 'var(--accent-warning)', cursor: 'pointer' }}
                        activeDot={{ r: 6, onClick: (_e: any, payload: any) => onPointClick(payload.payload) }}
                    />
                </LineChart>
            </ResponsiveContainer>
            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Click a dot to edit that specific history entry
            </div>
        </div>
    );
}
