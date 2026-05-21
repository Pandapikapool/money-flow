// FlowCraft insight engine — pluggable interface.
// The default RuleBasedEngine ships with the app; an AIInsightEngine
// could later implement the same interface without changing callers.

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

export interface InsightContext {
    userId: string;
    today: Date;
}

export interface InsightEngine {
    generateInsights(ctx: InsightContext): Promise<Insight[]>;
}
