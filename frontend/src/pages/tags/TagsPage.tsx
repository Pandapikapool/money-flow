import { useState, useEffect } from "react";
import { fetchTags, fetchSpecialTags, createTag, createSpecialTag, type Tag, type SpecialTag } from "../../lib/api";

// API functions for tag management (will add to api.ts)
const API_BASE = "http://localhost:3000";

async function deleteTag(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/tags/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete tag");
}

async function deleteSpecialTag(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/special-tags/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete special tag");
}

async function renameTag(id: number, name: string): Promise<Tag> {
    const res = await fetch(`${API_BASE}/tags/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("Failed to rename tag");
    return res.json();
}

export default function TagsPage() {
    const [tags, setTags] = useState<Tag[]>([]);
    const [specialTags, setSpecialTags] = useState<SpecialTag[]>([]);
    const [loading, setLoading] = useState(true);

    // New tag form
    const [newTagName, setNewTagName] = useState("");
    const [newSpecialTagName, setNewSpecialTagName] = useState("");

    // Edit state
    const [editingTagId, setEditingTagId] = useState<number | null>(null);
    const [editTagName, setEditTagName] = useState("");

    // Delete confirmation
    const [deletingTagId, setDeletingTagId] = useState<number | null>(null);
    const [deletingSpecialTagId, setDeletingSpecialTagId] = useState<number | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [tagsData, specialTagsData] = await Promise.all([
                fetchTags(),
                fetchSpecialTags()
            ]);
            setTags(tagsData);
            setSpecialTags(specialTagsData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Tag handlers
    const handleCreateTag = async () => {
        if (!newTagName.trim()) return;
        try {
            await createTag(newTagName.trim());
            setNewTagName("");
            loadData();
        } catch (err) {
            alert("Failed to create tag");
        }
    };

    const startEditTag = (tag: Tag) => {
        setEditingTagId(tag.id);
        setEditTagName(tag.name);
    };

    const saveEditTag = async () => {
        if (!editingTagId || !editTagName.trim()) return;
        try {
            await renameTag(editingTagId, editTagName.trim());
            setEditingTagId(null);
            setEditTagName("");
            loadData();
        } catch (err) {
            alert("Failed to rename tag");
        }
    };

    const handleDeleteTag = async (id: number) => {
        try {
            await deleteTag(id);
            setDeletingTagId(null);
            loadData();
        } catch (err) {
            alert("Failed to delete tag. It may be in use by expenses.");
        }
    };

    // Special tag handlers
    const handleCreateSpecialTag = async () => {
        if (!newSpecialTagName.trim()) return;
        try {
            await createSpecialTag(newSpecialTagName.trim());
            setNewSpecialTagName("");
            loadData();
        } catch (err) {
            alert("Failed to create special tag");
        }
    };

    const handleDeleteSpecialTag = async (id: number) => {
        try {
            await deleteSpecialTag(id);
            setDeletingSpecialTagId(null);
            loadData();
        } catch (err) {
            alert("Failed to delete special tag");
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

    return (
        <div style={{ maxWidth: '900px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '600', marginBottom: '8px' }}>Tags Management</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
                Manage your expense categories and special tags
            </p>

            {/* Expense Tags Section */}
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '16px' }}>
                    Expense Tags ({tags.length})
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Categories for organizing your expenses. Each expense must have one tag.
                </p>

                {/* Add new tag */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                    <input
                        type="text"
                        value={newTagName}
                        onChange={e => setNewTagName(e.target.value)}
                        placeholder="New tag name..."
                        onKeyDown={e => e.key === 'Enter' && handleCreateTag()}
                        style={{ flex: 1 }}
                    />
                    <button
                        onClick={handleCreateTag}
                        style={{
                            padding: '8px 16px',
                            background: 'var(--accent-primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        Add Tag
                    </button>
                </div>

                {/* Tags list */}
                {tags.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                        No tags yet. Create your first tag above.
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {tags.map(tag => (
                            <div
                                key={tag.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    background: 'var(--bg-panel)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)'
                                }}
                            >
                                {editingTagId === tag.id ? (
                                    <>
                                        <input
                                            type="text"
                                            value={editTagName}
                                            onChange={e => setEditTagName(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && saveEditTag()}
                                            autoFocus
                                            style={{ width: '120px', padding: '4px 8px', fontSize: '0.9rem' }}
                                        />
                                        <button onClick={saveEditTag} style={{ padding: '2px 6px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Save</button>
                                        <button onClick={() => setEditingTagId(null)} style={{ padding: '2px 6px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-primary)' }}>Cancel</button>
                                    </>
                                ) : (
                                    <>
                                        <span style={{ fontWeight: '500' }}>{tag.name}</span>
                                        <button
                                            onClick={() => startEditTag(tag)}
                                            style={{ padding: '2px 6px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-secondary)' }}
                                        >
                                            Edit
                                        </button>
                                        {deletingTagId === tag.id ? (
                                            <>
                                                <button onClick={() => handleDeleteTag(tag.id)} style={{ padding: '2px 6px', background: 'var(--accent-danger)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Yes</button>
                                                <button onClick={() => setDeletingTagId(null)} style={{ padding: '2px 6px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-primary)' }}>No</button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => setDeletingTagId(tag.id)}
                                                style={{ padding: '2px 6px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--accent-danger)' }}
                                            >
                                                ×
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Special Tags Section */}
            <div className="glass-panel" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '16px' }}>
                    Special Tags ({specialTags.length})
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Optional markers you can add to any expense. Multiple special tags can be applied to one expense.
                </p>

                {/* Add new special tag */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                    <input
                        type="text"
                        value={newSpecialTagName}
                        onChange={e => setNewSpecialTagName(e.target.value)}
                        placeholder="New special tag..."
                        onKeyDown={e => e.key === 'Enter' && handleCreateSpecialTag()}
                        style={{ flex: 1 }}
                    />
                    <button
                        onClick={handleCreateSpecialTag}
                        style={{
                            padding: '8px 16px',
                            background: 'var(--accent-primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        Add Special Tag
                    </button>
                </div>

                {/* Special tags list */}
                {specialTags.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                        No special tags yet. Examples: "Fixed Expense", "Reimbursable", "Emergency"
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {specialTags.map(tag => (
                            <div
                                key={tag.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    background: 'var(--accent-primary)',
                                    color: '#fff',
                                    borderRadius: '16px'
                                }}
                            >
                                <span style={{ fontWeight: '500' }}>{tag.name}</span>
                                {deletingSpecialTagId === tag.id ? (
                                    <>
                                        <button onClick={() => handleDeleteSpecialTag(tag.id)} style={{ padding: '2px 6px', background: 'var(--accent-danger)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Yes</button>
                                        <button onClick={() => setDeletingSpecialTagId(null)} style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.3)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>No</button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setDeletingSpecialTagId(tag.id)}
                                        style={{ padding: '0 4px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'rgba(255,255,255,0.8)' }}
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
