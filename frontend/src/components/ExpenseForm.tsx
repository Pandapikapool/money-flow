import { useState, useEffect } from 'react';
import {
    createExpense,
    fetchTags,
    createTag,
    fetchSpecialTags,
    type Tag,
    type SpecialTag,
} from '../lib/api';

const toTitleCase = (str: string) =>
    str
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());

const FUEL_RE = /\b(fuel|petrol|gas|diesel)\b/i;

// Slightly deeper than the previous pastel set so the chips read against
// glass panels without losing the calm vibe.
const moodPalette: Record<string, string> = {
    stress: '#9B96B5',      // muted lavender
    joy: '#8FA086',         // deeper sage
    social: '#B5944F',      // ochre
    convenience: '#C19E73', // warm sand
    health: '#6F9C84',      // deeper teal-sage
    impulse: '#D78B97',     // dusk-rose
};

// One human-centered axis, function-first (no "did you need it?" judgment).
// Essential = had to. Comfort = nice-to-have. Treat = chosen pleasure.
const KIND_OPTIONS: { label: string; value: 'essential' | 'comfort' | 'treat'; color: string }[] = [
    { label: 'Essential', value: 'essential', color: '#7D8F6F' }, // grounded sage
    { label: 'Comfort',   value: 'comfort',   color: '#B5944F' }, // ochre
    { label: 'Treat',     value: 'treat',     color: '#D78B97' }, // dusk-rose
];

// Bullet-journal style prompts — short, non-judgmental, rotate each render.
// Self-compassion frame: function and feeling, not guilt or avoidance.
const NOTE_PROMPTS = [
    'What did this do for you?',
    'How does it land now?',
    'One word for how it felt.',
    'What were you carrying when you bought it?',
    'Would you replay it the same?',
    'If a friend told you about this, what would you say?',
];

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

    // Function-of-spend: essential / comfort / treat. null = no answer.
    const [kind, setKind] = useState<'essential' | 'comfort' | 'treat' | null>(null);

    // Bullet-journal style note prompt — picked once per mount so it stays
    // stable while the user fills out the form, but varies between adds.
    const [notePrompt] = useState<string>(
        () => NOTE_PROMPTS[Math.floor(Math.random() * NOTE_PROMPTS.length)]
    );

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchTags().then(setTags).catch(console.error);
        fetchSpecialTags().then(setSpecialTags).catch(console.error);
    }, []);

    // Conditional-prompt thresholds (user policy):
    //   amount > 100  AND non-fuel  -> mood + kind chips + softer note prompt
    //   amount > 250  AND non-fuel  -> note becomes required
    //   amount > 1500 AND fuel-like -> note becomes required (no chips — fuel is routine)
    const amountNum = parseFloat(amount) || 0;
    const isFuelLike = FUEL_RE.test(tagName);
    const showChips = amountNum > 100 && !isFuelLike;
    const notesNeeded = (amountNum > 250 && !isFuelLike) || (amountNum > 1500 && isFuelLike);

    const moodTags = specialTags.filter((t) => t.name.startsWith('mood:'));
    const otherSpecialTags = specialTags.filter((t) => !t.name.startsWith('mood:'));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !statement || !tagName.trim()) {
            alert('Amount, Statement, and Tag are required.');
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
            const existingTag = tags.find(
                (t) => t.name.toLowerCase() === normalizedTagName.toLowerCase()
            );

            if (existingTag) {
                finalTagId = existingTag.id;
            } else {
                const newTag = await createTag(normalizedTagName);
                setTags((prev) => [...prev, newTag]);
                finalTagId = newTag.id;
            }

            const meta: { kind?: 'essential' | 'comfort' | 'treat' } = {};
            if (kind !== null) meta.kind = kind;

            await createExpense({
                date: new Date(date).toISOString(),
                amount: parseFloat(amount),
                statement,
                tag_id: finalTagId,
                special_tag_ids: selectedSpecialTagIds,
                notes,
                meta: Object.keys(meta).length > 0 ? meta : undefined,
            });

            setAmount('');
            setStatement('');
            setTagName('');
            setSelectedSpecialTagIds([]);
            setNotes('');
            setNoteWarning(false);
            setKind(null);

            onSuccess();
        } catch (err) {
            alert('Failed to save expense');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleSpecialTag = (id: number) => {
        setSelectedSpecialTagIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
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

    // Hex-with-alpha for the tinted unselected background. 1A ≈ 10% alpha.
    const tintBg = (hex: string) => `${hex}1A`;

    return (
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '24px' }}>
            {/* Amount */}
            <div style={{ marginBottom: '16px' }}>
                <label style={fieldLabel}>Amount</label>
                <div style={{ position: 'relative' }}>
                    <span
                        style={{
                            position: 'absolute',
                            left: '16px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '1.3rem',
                            color: 'var(--text-secondary)',
                        }}
                    >
                        ₹
                    </span>
                    <input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        style={{
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            paddingLeft: '30px',
                            width: '100%',
                        }}
                        autoFocus
                    />
                </div>
            </div>

            {/* Statement */}
            <div style={{ marginBottom: '16px' }}>
                <label style={fieldLabel}>What was it for?</label>
                <input
                    type="text"
                    value={statement}
                    onChange={(e) => setStatement(e.target.value)}
                    placeholder="Groceries, Uber, Dinner..."
                />
            </div>

            {/* Date */}
            <div style={{ marginBottom: '16px' }}>
                <label style={fieldLabel}>Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            {/* Tag */}
            <div style={{ marginBottom: '16px' }}>
                <label style={fieldLabel}>
                    Category <span style={{ opacity: 0.6 }}>(type to create new)</span>
                </label>
                <input
                    list="tags-list"
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    placeholder="Food, Transport, Bills..."
                />
                <datalist id="tags-list">
                    {tags.map((t) => (
                        <option key={t.id} value={t.name} />
                    ))}
                </datalist>
            </div>

            {/* Kind — what did this do for you? (amount > 100, non-fuel) */}
            {showChips && (
                <div style={{ marginBottom: '16px', animation: 'efFadeIn 0.22s ease-out' }}>
                    <label style={fieldLabel}>
                        What was this? <span style={{ opacity: 0.6 }}>(optional)</span>
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {KIND_OPTIONS.map((opt) => {
                            const isSelected = kind === opt.value;
                            return (
                                <button
                                    type="button"
                                    key={opt.value}
                                    onClick={() => setKind(isSelected ? null : opt.value)}
                                    style={{
                                        padding: '7px 16px',
                                        borderRadius: '16px',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        fontWeight: 500,
                                        border: `1.5px solid ${opt.color}`,
                                        background: isSelected ? opt.color : tintBg(opt.color),
                                        color: isSelected ? '#fff' : opt.color,
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

            {/* Mood — how did this feel? (amount > 100, non-fuel) */}
            {showChips && moodTags.length > 0 && (
                <div style={{ marginBottom: '16px', animation: 'efFadeIn 0.22s ease-out' }}>
                    <label style={fieldLabel}>
                        How did this feel? <span style={{ opacity: 0.6 }}>(optional)</span>
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {moodTags.map((mt) => {
                            const isSelected = selectedSpecialTagIds.includes(mt.id);
                            const bare = mt.name.replace(/^mood:/, '').toLowerCase();
                            const tint = moodPalette[bare] || '#C9A66B';
                            return (
                                <button
                                    type="button"
                                    key={mt.id}
                                    onClick={() => toggleSpecialTag(mt.id)}
                                    style={{
                                        padding: '7px 16px',
                                        borderRadius: '16px',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        fontWeight: 500,
                                        border: `1.5px solid ${tint}`,
                                        background: isSelected ? tint : tintBg(tint),
                                        color: isSelected ? '#fff' : tint,
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    {moodLabel(mt.name)}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Other special tags (everything that isn't a mood:* entry) */}
            {otherSpecialTags.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                    <label style={fieldLabel}>
                        Special Tags <span style={{ opacity: 0.6 }}>(optional)</span>
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {otherSpecialTags.map((st) => {
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
                                        background: isSelected
                                            ? 'var(--accent-primary)'
                                            : 'transparent',
                                        color: isSelected ? '#fff' : 'var(--accent-primary)',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {st.name}
                                </div>
                            );
                        })}
                    </div>
                    <p
                        style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            marginTop: '6px',
                        }}
                    >
                        Manage special tags in{' '}
                        <a href="/tags" style={{ color: 'var(--accent-primary)' }}>
                            Tags page
                        </a>
                    </p>
                </div>
            )}

            {/* Notes — bullet-journal prompt when amount > 100, required for > 250 / > 1500 fuel */}
            <div style={{ marginBottom: '20px' }}>
                <label style={fieldLabel}>
                    Notes{' '}
                    <span style={{ opacity: 0.6 }}>
                        {notesNeeded
                            ? '(a few words help future-you remember)'
                            : showChips
                              ? '(optional)'
                              : '(optional)'}
                    </span>
                </label>
                <input
                    type="text"
                    value={notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder={
                        notesNeeded
                            ? notePrompt
                            : showChips
                              ? notePrompt
                              : 'Any additional details...'
                    }
                    style={{
                        borderColor: noteWarning ? '#C9A66B' : undefined,
                    }}
                />
                {noteWarning && (
                    <p
                        style={{
                            fontSize: '0.8rem',
                            color: '#C9A66B',
                            marginTop: '6px',
                            fontStyle: 'italic',
                        }}
                    >
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
                    cursor: 'pointer',
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

const fieldLabel: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
};
