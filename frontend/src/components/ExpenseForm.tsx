import { useState, useEffect } from 'react';
import { createExpense, fetchTags, createTag, fetchSpecialTags, type Tag, type SpecialTag } from '../lib/api';

// Helper to convert to Title Case
const toTitleCase = (str: string) => {
    return str.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
};

interface Props {
    onSuccess: () => void;
}

export default function ExpenseForm({ onSuccess }: Props) {
    const [amount, setAmount] = useState('');
    const [statement, setStatement] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Default today

    // Tag Logic
    const [tagName, setTagName] = useState('');
    const [tags, setTags] = useState<Tag[]>([]);

    // Special Tags Logic (select only, no creation here)
    const [specialTags, setSpecialTags] = useState<SpecialTag[]>([]);
    const [selectedSpecialTagIds, setSelectedSpecialTagIds] = useState<number[]>([]);

    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchTags().then(setTags).catch(console.error);
        fetchSpecialTags().then(setSpecialTags).catch(console.error);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !statement || !tagName.trim()) {
            alert("Amount, Statement, and Tag are required.");
            return;
        }

        setLoading(true);
        try {
            // Resolve Tag ID (Find or Create with Title Case)
            let finalTagId: number;
            const normalizedTagName = toTitleCase(tagName);
            const existingTag = tags.find(t => t.name.toLowerCase() === normalizedTagName.toLowerCase());

            if (existingTag) {
                finalTagId = existingTag.id;
            } else {
                const newTag = await createTag(normalizedTagName);
                setTags(prev => [...prev, newTag]);
                finalTagId = newTag.id;
            }

            // Create Expense with selected date
            await createExpense({
                date: new Date(date).toISOString(),
                amount: parseFloat(amount),
                statement,
                tag_id: finalTagId,
                special_tag_ids: selectedSpecialTagIds,
                notes
            });

            // Reset form (keep date as is for convenience)
            setAmount('');
            setStatement('');
            setTagName('');
            setSelectedSpecialTagIds([]);
            setNotes('');

            onSuccess();
        } catch (err) {
            alert("Failed to save expense");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleSpecialTag = (id: number) => {
        setSelectedSpecialTagIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    return (
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '24px' }}>
            {/* Amount */}
            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Amount</label>
                <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.3rem', color: 'var(--text-secondary)' }}>₹</span>
                    <input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="0.00"
                        style={{ fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center', paddingLeft: '30px', width: '100%' }}
                        autoFocus
                    />
                </div>
            </div>

            {/* Statement */}
            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>What was it for?</label>
                <input
                    type="text"
                    value={statement}
                    onChange={e => setStatement(e.target.value)}
                    placeholder="Groceries, Uber, Dinner..."
                />
            </div>

            {/* Date */}
            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Date</label>
                <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                />
            </div>

            {/* Tag */}
            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Category <span style={{ opacity: 0.6 }}>(type to create new)</span>
                </label>
                <input
                    list="tags-list"
                    value={tagName}
                    onChange={e => setTagName(e.target.value)}
                    placeholder="Food, Transport, Bills..."
                />
                <datalist id="tags-list">
                    {tags.map(t => <option key={t.id} value={t.name} />)}
                </datalist>
            </div>

            {/* Special Tags (select only) */}
            {specialTags.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Special Tags <span style={{ opacity: 0.6 }}>(optional)</span>
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {specialTags.map(st => {
                            const isSelected = selectedSpecialTagIds.includes(st.id);
                            return (
                                <div
                                    key={st.id}
                                    onClick={() => toggleSpecialTag(st.id)}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '16px',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        border: '1px solid var(--accent-primary)',
                                        background: isSelected ? 'var(--accent-primary)' : 'transparent',
                                        color: isSelected ? '#fff' : 'var(--accent-primary)',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    {st.name}
                                </div>
                            );
                        })}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                        Manage special tags in <a href="/tags" style={{ color: 'var(--accent-primary)' }}>Tags page</a>
                    </p>
                </div>
            )}

            {/* Notes */}
            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Notes <span style={{ opacity: 0.6 }}>(optional)</span></label>
                <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Any additional details..."
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                style={{
                    width: '100%',
                    padding: '14px',
                    background: 'var(--accent-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                }}
            >
                {loading ? 'Saving...' : 'Add Expense'}
            </button>
        </form>
    );
}
