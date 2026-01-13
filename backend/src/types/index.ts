export interface RequestContext {
    userId: string;
}

export interface SpecialTag {
    id: number;
    user_id: string;
    name: string;
}

export interface Tag {
    id: number;
    user_id: string;
    name: string;
    page_type: string; // 'expense', 'income', etc.
}

export interface MonthlyBudget {
    user_id: string;
    year: number;
    month: number;
    amount: number;
    notes?: string;
}

export interface Expense {
    id: number;
    user_id: string;
    date: Date;
    amount: string; // Numeric in PG comes as string often, or number. Let's use string for safety with currency or number.
    // Actually, 'pg' driver returns string for numeric/decimal types by default unless configured.
    // Let's coerce to number in repo or keep as string/number.

    statement: string;
    tag_id: number | null;
    notes: string | null;
    created_at?: Date;
}

export interface CreateExpenseParams {
    date: string; // ISO string
    amount: number;
    statement: string;
    tag_id: number;
    special_tag_ids?: number[];
    notes?: string;
}

export interface UpdateExpenseParams {
    date?: string;
    amount?: number;
    statement?: string;
    tag_id?: number;
    special_tag_ids?: number[];
    notes?: string;
}
