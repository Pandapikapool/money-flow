import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { type AccountHistory } from '../lib/api';
import { SETTINGS } from '../lib/settings';

interface Props {
    data: AccountHistory[];
    onPointClick: (entry: AccountHistory) => void;
}

export default function AccountHistoryGraph({ data, onPointClick }: Props) {
    if (!data || data.length === 0) return <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>No history data</div>;

    return (
        <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
            <ResponsiveContainer>
                <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
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
                        tickFormatter={(val) => `${SETTINGS.CURRENCY}${val}`}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                        formatter={(value: any) => [`${SETTINGS.CURRENCY}${Number(value).toLocaleString()}`, 'Balance']}
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Line
                        type="monotone"
                        dataKey="balance"
                        stroke="var(--accent-primary)"
                        strokeWidth={2}
                        dot={{ r: 4, fill: 'var(--accent-primary)', cursor: 'pointer' }}
                        activeDot={{ r: 6, onClick: (_e: any, payload: any) => onPointClick(payload.payload) }}
                        onClick={(e: any) => {
                            // Sometimes the dot click is tricky, capturing line click near data point might be needed
                            if (e && e.activePayload) {
                                onPointClick(e.activePayload[0].payload);
                            }
                        }}
                    />
                </LineChart>
            </ResponsiveContainer>
            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Click a dot to edit that specific history entry
            </div>
        </div>
    );
}
