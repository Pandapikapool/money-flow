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

export interface JournalEntry {
    id: number;
    expense_id: number | null;
    prompt: string | null;
    answer: string;
    mood: string | null;
    created_at: string;
}

export async function fetchJournalEntries(): Promise<JournalEntry[]> {
    const res = await fetch(`${API_BASE}/flowcraft/journal`);
    if (!res.ok) throw new Error("Failed to load journal entries");
    return res.json();
}

export interface WeekStory {
    week_of: string;
    week_label: string;
    total: number;
    count: number;
    top_categories: { tag: string; total: number; count: number }[];
    biggest_day: { date: string; weekday: string; total: number } | null;
    by_day: { date: string; weekday: string; total: number }[];
    mood_counts: { mood: string; count: number }[];
}

export async function fetchWeekStory(weekOffset: number = 0): Promise<WeekStory> {
    const res = await fetch(`${API_BASE}/flowcraft/story?week_offset=${weekOffset}`);
    if (!res.ok) throw new Error("Failed to load week story");
    return res.json();
}

// === Goals (suggestion) ===

export interface GoalSuggestion {
    top_categories: { tag_id: number; tag_name: string; last_30d_total: number }[];
    suggestion: {
        kind: 'cap-category';
        target_tag_id: number;
        target_amount: number;
        tag_name: string;
        rationale: string;
    } | null;
}

export async function fetchGoalSuggestion(): Promise<GoalSuggestion> {
    const res = await fetch(`${API_BASE}/flowcraft/goals/suggestion`);
    if (!res.ok) throw new Error("Failed to load goal suggestion");
    return res.json();
}

// === Analytics ===

export interface AnalyticsResult {
    scope: { category: string; from?: string; to?: string; amount_min?: number; amount_max?: number };
    total: number;
    count: number;
    min: number;
    max: number;
    avg: number;
    monthly: { month: string; total: number; count: number }[];
    top_categories?: { tag: string; total: number; count: number }[];
}

export async function fetchAnalyticsQuery(params: {
    category?: string;
    from?: string;
    to?: string;
    amount_min?: number;
    amount_max?: number;
}): Promise<AnalyticsResult> {
    const sp = new URLSearchParams();
    if (params.category) sp.set('category', params.category);
    if (params.from) sp.set('from', params.from);
    if (params.to) sp.set('to', params.to);
    if (params.amount_min !== undefined) sp.set('amount_min', String(params.amount_min));
    if (params.amount_max !== undefined) sp.set('amount_max', String(params.amount_max));
    const res = await fetch(`${API_BASE}/analytics/query?${sp.toString()}`);
    if (!res.ok) throw new Error("Failed to run analytics query");
    return res.json();
}

// === Goals ===

export type GoalKind = 'skip-category' | 'cap-category' | 'quiet-days';
export type GoalStatus = 'active' | 'held' | 'missed' | 'cancelled';

export interface Goal {
    id: number;
    user_id: string;
    kind: GoalKind;
    target_tag_id: number | null;
    target_amount: number | null;
    target_count: number | null;
    week_of: string;
    status: GoalStatus;
    bonus_applied: boolean;
    created_at: string;
    completed_at: string | null;
}

export interface GoalProgress {
    goal: Goal;
    numerator: number;
    denominator: number;
    held: boolean;
    missed: boolean;
    display: string;
    headline: string;
    tag_name?: string;
}

export interface ActiveGoalResponse {
    goal: Goal;
    progress: GoalProgress;
}

export type CreateGoalPayload =
    | { kind: 'skip-category'; target_tag_id: number }
    | { kind: 'cap-category'; target_tag_id: number; target_amount: number }
    | { kind: 'quiet-days'; target_count: number };

export async function fetchActiveGoal(): Promise<ActiveGoalResponse | null> {
    const res = await fetch(`${API_BASE}/flowcraft/goals/active`);
    if (!res.ok) throw new Error("Failed to load active goal");
    return res.json();
}

export async function createGoal(payload: CreateGoalPayload): Promise<Goal> {
    const res = await fetch(`${API_BASE}/flowcraft/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create goal");
    return res.json();
}

export async function cancelGoal(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/flowcraft/goals/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to cancel goal");
}
