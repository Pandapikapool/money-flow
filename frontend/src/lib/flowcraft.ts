import { API_BASE } from "./api";

export type InsightKind =
    | 'usual'
    | 'won'
    | 'recurring'
    | 'freely-yours'
    | 'quietly-bigger'
    | 'unused-sub'
    | 'small-swap'
    | 'keep-joy'
    | 'no-check-day'
    | 'unfounded-worry'
    | 'future-you'
    | 'journal-nudge';

export type InsightTone = 'calm' | 'gentle-attention' | 'compassionate';

export interface InsightAction {
    label: string;
    href?: string;
    payload?: Record<string, unknown>;
}

export interface Insight {
    kind: InsightKind;
    title: string;
    body: string;
    action?: InsightAction;
    impact?: string;
    tone: InsightTone;
}

export interface FlowcraftState {
    user_id: string;
    garden_stage: number;
    garden_variant: string;
    last_water: string | null;
    coin_mood: string;
    weekly_observation_seen_at: string | null;
    no_check_day_offered_at: string | null;
    updated_at: string;
}

export async function fetchInsights(): Promise<Insight[]> {
    const res = await fetch(`${API_BASE}/flowcraft/insights`);
    if (!res.ok) throw new Error("Failed to load insights");
    return res.json();
}

export async function fetchFlowcraftState(): Promise<FlowcraftState> {
    const res = await fetch(`${API_BASE}/flowcraft/state`);
    if (!res.ok) throw new Error("Failed to load state");
    return res.json();
}

export async function confirmRecurring(payload: {
    signature: string;
    sample: string;
    amount: number;
    cadenceDays: number;
}): Promise<void> {
    const res = await fetch(`${API_BASE}/flowcraft/recurring/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to confirm recurring");
}

export async function dismissRecurring(signature: string): Promise<void> {
    const res = await fetch(`${API_BASE}/flowcraft/recurring/dismiss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature }),
    });
    if (!res.ok) throw new Error("Failed to dismiss recurring");
}

export async function addJournalEntry(opts: {
    answer: string;
    expenseId?: number;
    prompt?: string;
    mood?: string;
}): Promise<{ id: number }> {
    const res = await fetch(`${API_BASE}/flowcraft/journal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
    });
    if (!res.ok) throw new Error("Failed to add journal entry");
    return res.json();
}
