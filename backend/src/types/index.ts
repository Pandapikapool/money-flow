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

// Optional human-centered dimensions captured alongside an expense.
// Stored in expenses.meta (JSONB). Keys are open-ended.
//
// `kind` is the one structured dimension we keep on the form: function
// over judgment — "what did this do for me?" rather than "did I need it?".
//   essential — had to
//   comfort   — nice-to-have, made life a little better
//   treat     — chosen pleasure
//
// (Earlier iterations captured `planned` and `energy`. Both have been
// retired from the form in favour of `kind`. JSONB is open-ended, so
// older rows with those keys remain valid and are simply ignored.)
export interface ExpenseMeta {
    kind?: "essential" | "comfort" | "treat";
    [key: string]: unknown;
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
    meta: ExpenseMeta;
    created_at?: Date;
}

export interface CreateExpenseParams {
    date: string; // ISO string
    amount: number;
    statement: string;
    tag_id: number;
    special_tag_ids?: number[];
    notes?: string;
    meta?: ExpenseMeta;
}

export interface UpdateExpenseParams {
    date?: string;
    amount?: number;
    statement?: string;
    tag_id?: number;
    special_tag_ids?: number[];
    notes?: string;
    meta?: ExpenseMeta;
}
