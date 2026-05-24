import { useState, useEffect } from 'react';
import { createExpense, fetchTags, createTag, fetchSpecialTags, type Tag, type SpecialTag } from '../lib/api';

const toTitleCase = (str: string) =>
    str.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

const FUEL_RE = /\b(fuel|petrol|gas|diesel)\b/i;

// Soft palette per mood — calmer than primary accent, all desaturated
const moodPalette: Record<string, string> = {
    stress:      '#B9B5C9',
    joy:         '#A8B5A0',
    social:      '#C9A66B',
    convenience: '#D6B894',
    health:      '#8FB39E',
    impulse:     '#E8B4B8',
};

interface Props {
    onSuccess: () => void;
}

export default function ExpenseForm({ onSuccess }: Props) {
    const [amount, setAmount] = useState('');
    const [statement, setStatement] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const [tagName, setTagName] = useState('');
    const [tags, setTags] = useState<Tag[]>([]);

    const [specialTags, setSpecialTags] = useState<SpecialTag[]>([]);
    const [selectedSpecialTagIds, setSelectedSpecialTagIds] = useState<number[]>([]);

    const [notes, setNotes] = useState('');
    const [noteWarning, setNoteWarning] = useState(false);
    // Quantitative dimension: was this spend planned ahead, or in the moment?
    // null = no answer (default); true = planned; false = impulse.
    const [planned, setPlanned] = useState<boolean | null>(null);

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchTags().then(setTags).catch(console.error);
        fetchSpecialTags().then(setSpecialTags).catch(console.error);
    }, []);

    // Conditional-prompt thresholds (user policy):
    //   amount > 100  AND non-fuel  -> ask mood + soft note prompt
    //   amount > 250  AND non-fuel  -> note becomes required
    //   amount > 1500 AND fuel-like -> note becomes required (no mood — fuel is routine)
    const amountNum = parseFloat(amount) || 0;
    const isFuelLike = FUEL_RE.test(tagName);
    const showMood = amountNum > 100 && !isFuelLike;
    const showPlanned = amountNum > 200 && !isFuelLike;
    const notesNeeded =
        (amountNum > 250 && !isFuelLike) ||
        (amountNum > 1500 && isFuelLike);

    const moodTags = specialTags.filter(t => t.name.startsWith('mood:'));
    const otherSpecialTags = specialTags.filter(t => !t.name.startsWith('mood:'));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !statement || !tagName.trim()) {
            alert("Amount, Statement, and Tag are required.");
            return;
        }

        if (notesNeeded && !notes.trim()) {
            setNoteWarning(true);
            return;
        }

        setLoading(true);
        try {
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

            await createExpense({
                date: new Date(date).toISOString(),
                amount: parseFloat(amount),
                statement,
                tag_id: finalTagId,
                special_tag_ids: selectedSpecialTagIds,
                notes,
                meta: planned !== null ? { planned } : undefined,
            });

            setAmount('');
            setStatement('');
            setTagName('');
            setSelectedSpecialTagIds([]);
            setNotes('');
            setNoteWarning(false);
            setPlanned(null);

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

    const handleNotesChange = (v: string) => {
        setNotes(v);
        if (noteWarning && v.trim()) setNoteWarning(false);
    };

    const moodLabel = (raw: string) => {
        const bare = raw.replace(/^mood:/, '');
        return bare.charAt(0).toUpperCase() + bare.slice(1);
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

            {/* Mood — appears once amount > 100 on a non-fuel category */}
            {showMood && moodTags.length > 0 && (
                <div style={{ marginBottom: '16px', animation: 'efFadeIn 0.22s ease-out' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        How did this feel? <span style={{ opacity: 0.6 }}>(optional, helps later analysis)</span>
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {moodTags.map(mt => {
                            const isSelected = selectedSpecialTagIds.includes(mt.id);
                            const bare = mt.name.replace(/^mood:/, '').toLowerCase();
                            const tint = moodPalette[bare] || '#C9A66B';
                            return (
                                <div
                                    key={mt.id}
                                    onClick={() => toggleSpecialTag(mt.id)}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '16px',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        border: `1px solid ${tint}`,
                                        background: isSelected ? tint : 'transparent',
                                        color: isSelected ? '#fff' : tint,
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    {moodLabel(mt.name)}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Planned vs impulse — appears once amount > 200 on a non-fuel category */}
            {showPlanned && (
                <div style={{ marginBottom: '16px', animation: 'efFadeIn 0.22s ease-out' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Planned ahead? <span style={{ opacity: 0.6 }}>(optional, helps later analysis)</span>
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {[
                            { label: 'Planned', value: true },
                            { label: 'In the moment', value: false },
                        ].map(opt => {
                            const isSelected = planned === opt.value;
                            return (
                                <button
                                    type="button"
                                    key={String(opt.value)}
                                    onClick={() => setPlanned(isSelected ? null : opt.value)}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '16px',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        border: '1px solid #A8B5A0',
                                        background: isSelected ? '#A8B5A0' : 'transparent',
                                        color: isSelected ? '#fff' : '#A8B5A0',
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Other special tags (everything that isn't a mood:* entry) */}
            {otherSpecialTags.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Special Tags <span style={{ opacity: 0.6 }}>(optional)</span>
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {otherSpecialTags.map(st => {
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

            {/* Notes — soft prompt for >100 non-fuel, required for >250 non-fuel or >1500 fuel */}
            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Notes <span style={{ opacity: 0.6 }}>
                        {notesNeeded
                            ? '(a few words help future-you remember)'
                            : showMood
                                ? '(optional — a small note?)'
                                : '(optional)'}
                    </span>
                </label>
                <input
                    type="text"
                    value={notes}
                    onChange={e => handleNotesChange(e.target.value)}
                    placeholder={notesNeeded ? 'a few words…' : 'Any additional details...'}
                    style={{
                        borderColor: noteWarning ? '#C9A66B' : undefined,
                    }}
                />
                {noteWarning && (
                    <p style={{
                        fontSize: '0.8rem',
                        color: '#C9A66B',
                        marginTop: '6px',
                        fontStyle: 'italic',
                    }}>
                        even one word — what was it for, or how it felt?
                    </p>
                )}
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

            <style>{`
                @keyframes efFadeIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </form>
    );
}
