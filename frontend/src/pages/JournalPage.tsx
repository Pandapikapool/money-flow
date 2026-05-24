import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addJournalEntry, fetchJournalEntries } from '../lib/flowcraft';

const PROMPTS = [
    'Why did I buy this?',
    'Was it worth it?',
    'How did I feel?',
    'What could I do next time?',
    'Anything else…',
];

const MOODS = ['joy', 'calm', 'stress', 'social', 'convenience', 'health', 'impulse'];

export default function JournalPage() {
    const queryClient = useQueryClient();
    const [prompt, setPrompt] = useState<string>(PROMPTS[0]);
    const [answer, setAnswer] = useState('');
    const [mood, setMood] = useState<string>('');

    const { data: entries, isLoading } = useQuery({
        queryKey: ['flowcraft-journal'],
        queryFn: fetchJournalEntries,
    });

    const addMut = useMutation({
        mutationFn: () =>
            addJournalEntry({
                answer,
                prompt,
                mood: mood || undefined,
            }),
        onSuccess: () => {
            setAnswer('');
            setMood('');
            queryClient.invalidateQueries({ queryKey: ['flowcraft-journal'] });
        },
    });

    const canSave = answer.trim().length > 0 && !addMut.isPending;

    return (
        <div
            style={{
                maxWidth: '720px',
                margin: '0 auto',
                padding: '8px 0 40px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
            }}
        >
            <header
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                }}
            >
                <div>
                    <h1
                        style={{
                            fontSize: '1.4rem',
                            fontWeight: 600,
                            margin: 0,
                            color: 'var(--text-primary)',
                            fontFamily: 'Georgia, "Times New Roman", serif',
                            letterSpacing: '-0.01em',
                        }}
                    >
                        Journal
                    </h1>
                    <div
                        style={{
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)',
                            marginTop: '2px',
                        }}
                    >
                        small notes to future-you
                    </div>
                </div>
                <Link
                    to="/flow"
                    style={{
                        color: 'var(--text-secondary)',
                        textDecoration: 'none',
                        fontSize: '0.9rem',
                        padding: '6px 12px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                    }}
                >
                    ← Flow
                </Link>
            </header>

            {/* Add entry */}
            <div className="glass-panel" style={{ padding: '20px 24px' }}>
                <label style={labelStyle}>Prompt</label>
                <select
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    style={{ marginBottom: '14px' }}
                >
                    {PROMPTS.map((p) => (
                        <option key={p} value={p}>
                            {p}
                        </option>
                    ))}
                </select>

                <label style={labelStyle}>
                    Answer <span style={{ opacity: 0.6 }}>({500 - answer.length} chars left)</span>
                </label>
                <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value.slice(0, 500))}
                    placeholder="A sentence is enough."
                    rows={3}
                    style={{
                        width: '100%',
                        background: 'var(--input-bg)',
                        border: '1px solid var(--border-color)',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontFamily: 'inherit',
                        fontSize: '0.95rem',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                        marginBottom: '14px',
                    }}
                />

                <label style={labelStyle}>
                    Mood <span style={{ opacity: 0.6 }}>(optional)</span>
                </label>
                <div
                    style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}
                >
                    {MOODS.map((m) => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => setMood(mood === m ? '' : m)}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '16px',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                border: '1px solid var(--accent-primary)',
                                background: mood === m ? 'var(--accent-primary)' : 'transparent',
                                color: mood === m ? '#fff' : 'var(--accent-primary)',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            {m}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => addMut.mutate()}
                    disabled={!canSave}
                    style={{
                        background: 'var(--accent-primary)',
                        color: '#fff',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '10px',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        cursor: canSave ? 'pointer' : 'not-allowed',
                        opacity: canSave ? 1 : 0.5,
                    }}
                >
                    {addMut.isPending ? 'Saving…' : 'Save'}
                </button>
                {addMut.isError && (
                    <p
                        style={{
                            fontSize: '0.82rem',
                            color: 'var(--accent-warning)',
                            marginTop: '10px',
                            marginBottom: 0,
                            fontStyle: 'italic',
                        }}
                    >
                        Something blocked the save. Try once more?
                    </p>
                )}
            </div>

            {/* Past entries */}
            <section>
                <h2
                    style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-secondary)',
                        fontWeight: 500,
                        margin: '0 0 12px',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                    }}
                >
                    Past entries
                </h2>
                {isLoading && (
                    <div
                        style={{
                            color: 'var(--text-secondary)',
                            fontStyle: 'italic',
                            fontSize: '0.9rem',
                        }}
                    >
                        Loading…
                    </div>
                )}
                {!isLoading && (!entries || entries.length === 0) && (
                    <div
                        className="glass-panel"
                        style={{
                            padding: '20px',
                            textAlign: 'center',
                            color: 'var(--text-secondary)',
                            fontStyle: 'italic',
                        }}
                    >
                        No entries yet. That's allowed.
                    </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {entries?.map((e) => (
                        <article
                            key={e.id}
                            className="glass-panel"
                            style={{ padding: '16px 18px' }}
                        >
                            <div
                                style={{
                                    fontSize: '0.78rem',
                                    color: 'var(--text-secondary)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: '6px',
                                }}
                            >
                                <span>
                                    {new Date(e.created_at).toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                    })}
                                </span>
                                {e.mood && (
                                    <span style={{ textTransform: 'capitalize' }}>· {e.mood}</span>
                                )}
                            </div>
                            {e.prompt && (
                                <div
                                    style={{
                                        fontSize: '0.85rem',
                                        color: 'var(--text-secondary)',
                                        fontStyle: 'italic',
                                        marginBottom: '6px',
                                    }}
                                >
                                    {e.prompt}
                                </div>
                            )}
                            <div
                                style={{
                                    fontSize: '0.95rem',
                                    color: 'var(--text-primary)',
                                    lineHeight: 1.55,
                                    whiteSpace: 'pre-wrap',
                                }}
                            >
                                {e.answer}
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
}

const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
};
