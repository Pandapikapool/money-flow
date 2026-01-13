export const API_BASE = "http://localhost:3000";

export interface Expense {
    id: number;
    user_id: string;
    date: string;
    amount: number; // Parsed from string
    statement: string;
    tag_id: number;
    notes?: string;
}

export interface Tag {
    id: number;
    name: string;
    page_type: string;
}

export interface MonthlyBudget {
    amount: number;
    month: number;
    year: number;
}

export interface CreateExpenseData {
    date: string;
    amount: number;
    statement: string;
    tag_id: number;
    special_tag_ids?: number[];
    notes?: string;
}

export interface SpecialTag {
    id: number;
    name: string;
}

export async function fetchTags(): Promise<Tag[]> {
    const res = await fetch(`${API_BASE}/tags`);
    if (!res.ok) throw new Error("Failed to fetch tags");
    return res.json();
}

export async function createTag(name: string, pageType: string = 'expense'): Promise<Tag> {
    const res = await fetch(`${API_BASE}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, page_type: pageType }),
    });
    if (!res.ok) throw new Error("Failed to create tag");
    return res.json();
}

export async function fetchSpecialTags(): Promise<SpecialTag[]> {
    const res = await fetch(`${API_BASE}/special-tags`);
    if (!res.ok) throw new Error("Failed to fetch special tags");
    return res.json();
}

export async function createSpecialTag(name: string): Promise<SpecialTag> {
    const res = await fetch(`${API_BASE}/special-tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("Failed to create special tag");
    return res.json();
}

export async function getBudget(year: number, month: number): Promise<MonthlyBudget> {
    const res = await fetch(`${API_BASE}/budgets/${year}/${month}`);
    if (!res.ok) throw new Error("Failed to fetch budget");
    return res.json();
}

export interface MonthlyAggregate {
    month: number;
    year: number;
    spent: number;
    budget: number;
}

export async function createExpense(data: CreateExpenseData): Promise<Expense> {
    const res = await fetch(`${API_BASE}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create expense");
    return res.json();
}

export async function getYearSummary(year: number): Promise<MonthlyAggregate[]> {
    const res = await fetch(`${API_BASE}/expenses/summary/${year}`);
    if (!res.ok) throw new Error("Failed to fetch year summary");
    return res.json();
}

export async function fetchExpenses(year: number, month: number): Promise<Expense[]> {
    const res = await fetch(`${API_BASE}/expenses?year=${year}&month=${month}`);
    if (!res.ok) throw new Error("Failed to fetch expenses");
    return res.json();
}

export async function updateExpense(id: number, data: { amount?: number; statement?: string; date?: string; tag_id?: number; special_tag_ids?: number[]; notes?: string }): Promise<Expense> {
    const res = await fetch(`${API_BASE}/expenses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update expense");
    return res.json();
}

export async function getExpenseSpecialTags(expenseId: number): Promise<number[]> {
    const res = await fetch(`${API_BASE}/expenses/${expenseId}/special-tags`);
    if (!res.ok) throw new Error("Failed to fetch expense special tags");
    return res.json();
}

export async function deleteExpense(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/expenses/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete expense");
}

export async function deleteExpensesByMonths(year: number, months: number[]): Promise<{ deletedCount: number }> {
    const res = await fetch(`${API_BASE}/expenses/year/${year}/months`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months }),
    });
    if (!res.ok) throw new Error("Failed to delete expenses");
    return res.json();
}

export interface Account {
    id: number;
    name: string;
    balance: number;
    notes?: string;
}

export interface Asset {
    id: number;
    name: string;
    value: number;
    type: string;
    notes?: string;
}

export interface DashboardSummary {
    expenses: number;
    accounts: number;
    assets: number;
    investments: number;
    plans: number;
    life_xp: number;
}

export async function setBudget(year: number, month: number, amount: number): Promise<MonthlyBudget> {
    const res = await fetch(`${API_BASE}/budgets/${year}/${month}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
    });
    if (!res.ok) throw new Error("Failed to set budget");
    return res.json();
}

// Resources (Accounts)
export async function fetchAccounts(): Promise<Account[]> {
    const res = await fetch(`${API_BASE}/resources/accounts`);
    if (!res.ok) throw new Error("Failed to fetch accounts");
    return res.json();
}

export async function createAccount(name: string, balance: number): Promise<Account> {
    const res = await fetch(`${API_BASE}/resources/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, balance }),
    });
    if (!res.ok) throw new Error("Failed to create account");
    return res.json();
}

export async function updateAccount(id: number, balance: number, notes: string): Promise<Account> {
    const res = await fetch(`${API_BASE}/resources/accounts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ balance, notes }),
    });
    if (!res.ok) throw new Error("Failed to update account");
    return res.json();
}

export async function deleteAccount(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/resources/accounts/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete account");
}

export interface AccountHistory {
    id: number;
    account_id: number;
    date: string;
    balance: number;
    notes?: string;
}

export async function fetchAccountHistory(accountId: number): Promise<AccountHistory[]> {
    const res = await fetch(`${API_BASE}/resources/accounts/${accountId}/history`);
    if (!res.ok) throw new Error("Failed to fetch history");
    return res.json();
}

export async function createHistoryEntry(accountId: number, date: string, balance: number, notes?: string): Promise<AccountHistory> {
    const res = await fetch(`${API_BASE}/resources/accounts/${accountId}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, balance, notes }),
    });
    if (!res.ok) throw new Error("Failed to create history entry");
    return res.json();
}

export async function updateHistoryEntry(id: number, balance: number, notes?: string, date?: string): Promise<AccountHistory> {
    const res = await fetch(`${API_BASE}/history/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ balance, notes, date }),
    });
    if (!res.ok) throw new Error("Failed to update history entry");
    return res.json();
}

export async function deleteHistoryEntry(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/history/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete history entry");
}

// Resources (Assets)
export async function fetchAssets(type?: string): Promise<Asset[]> {
    const url = type ? `${API_BASE}/resources/assets?type=${type}` : `${API_BASE}/resources/assets`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch assets");
    return res.json();
}

export async function createAsset(name: string, value: number, type: string, notes?: string): Promise<Asset> {
    const res = await fetch(`${API_BASE}/resources/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, value, type, notes }),
    });
    if (!res.ok) throw new Error("Failed to create asset");
    return res.json();
}

export async function updateAsset(id: number, name: string, value: number, notes: string): Promise<Asset> {
    const res = await fetch(`${API_BASE}/resources/assets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, value, notes }),
    });
    if (!res.ok) throw new Error("Failed to update asset");
    return res.json();
}

export async function deleteAsset(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/resources/assets/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete asset");
}

// Asset History
export interface AssetHistory {
    id: number;
    asset_id: number;
    date: string;
    value: number;
    notes?: string;
}

export async function fetchAssetHistory(assetId: number): Promise<AssetHistory[]> {
    const res = await fetch(`${API_BASE}/resources/assets/${assetId}/history`);
    if (!res.ok) throw new Error("Failed to fetch history");
    return res.json();
}

export async function createAssetHistoryEntry(assetId: number, date: string, value: number, notes?: string): Promise<AssetHistory> {
    const res = await fetch(`${API_BASE}/resources/assets/${assetId}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, value, notes }),
    });
    if (!res.ok) throw new Error("Failed to create history entry");
    return res.json();
}

export async function updateAssetHistoryEntry(id: number, value: number, notes?: string, date?: string): Promise<AssetHistory> {
    const res = await fetch(`${API_BASE}/resources/asset-history/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value, notes, date }),
    });
    if (!res.ok) throw new Error("Failed to update history entry");
    return res.json();
}

export async function deleteAssetHistoryEntry(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/resources/asset-history/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete history entry");
}

// Dashboard
export async function fetchDashboardSummary(): Promise<DashboardSummary> {
    const res = await fetch(`${API_BASE}/dashboard/summary`);
    if (!res.ok) throw new Error("Failed to fetch dashboard summary");
    return res.json();
}

// Plans (Insurance, Cover Plans)
export interface Plan {
    id: number;
    name: string;
    cover_amount: number;
    premium_amount: number;
    premium_frequency: string; // 'monthly', 'quarterly', 'half_yearly', 'yearly', 'custom'
    custom_frequency_days: number | null; // Only used when premium_frequency = 'custom'
    expiry_date: string | null;
    next_premium_date: string | null; // When next premium is due
    notes?: string;
}

export interface PlanHistory {
    id: number;
    plan_id: number;
    date: string;
    cover_amount: number;
    premium_amount: number;
    notes?: string;
}

export async function fetchPlans(): Promise<Plan[]> {
    const res = await fetch(`${API_BASE}/resources/plans`);
    if (!res.ok) throw new Error("Failed to fetch plans");
    return res.json();
}

export async function createPlan(
    name: string,
    cover_amount: number,
    premium_amount: number,
    premium_frequency: string,
    expiry_date?: string,
    next_premium_date?: string,
    notes?: string,
    custom_frequency_days?: number
): Promise<Plan> {
    const res = await fetch(`${API_BASE}/resources/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, cover_amount, premium_amount, premium_frequency, expiry_date, next_premium_date, notes, custom_frequency_days }),
    });
    if (!res.ok) throw new Error("Failed to create plan");
    return res.json();
}

export async function updatePlan(
    id: number,
    name: string,
    cover_amount: number,
    premium_amount: number,
    premium_frequency: string,
    expiry_date?: string,
    next_premium_date?: string,
    notes?: string,
    custom_frequency_days?: number
): Promise<Plan> {
    const res = await fetch(`${API_BASE}/resources/plans/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, cover_amount, premium_amount, premium_frequency, expiry_date, next_premium_date, notes, custom_frequency_days }),
    });
    if (!res.ok) throw new Error("Failed to update plan");
    return res.json();
}

export async function deletePlan(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/resources/plans/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete plan");
}

// Plan History
export async function fetchPlanHistory(planId: number): Promise<PlanHistory[]> {
    const res = await fetch(`${API_BASE}/resources/plans/${planId}/history`);
    if (!res.ok) throw new Error("Failed to fetch plan history");
    return res.json();
}

export async function createPlanHistoryEntry(
    planId: number,
    date: string,
    cover_amount: number,
    premium_amount: number,
    notes?: string
): Promise<PlanHistory> {
    const res = await fetch(`${API_BASE}/resources/plans/${planId}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, cover_amount, premium_amount, notes }),
    });
    if (!res.ok) throw new Error("Failed to create plan history entry");
    return res.json();
}

export async function updatePlanHistoryEntry(
    id: number,
    cover_amount: number,
    premium_amount: number,
    notes?: string,
    date?: string
): Promise<PlanHistory> {
    const res = await fetch(`${API_BASE}/resources/plan-history/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cover_amount, premium_amount, notes, date }),
    });
    if (!res.ok) throw new Error("Failed to update plan history entry");
    return res.json();
}

export async function deletePlanHistoryEntry(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/resources/plan-history/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete plan history entry");
}

// Life XP Buckets (Savings Goals)
export interface LifeXpBucket {
    id: number;
    name: string;
    target_amount: number;
    saved_amount: number;
    is_repetitive: boolean;
    contribution_frequency: string | null; // 'monthly', 'quarterly', 'yearly', 'custom'
    custom_frequency_days: number | null; // Only used when contribution_frequency = 'custom'
    next_contribution_date: string | null;
    status: string;
    notes?: string;
}

export interface LifeXpHistory {
    id: number;
    bucket_id: number;
    date: string;
    amount: number;
    total_saved: number;
    notes?: string;
}

export async function fetchLifeXpBuckets(): Promise<LifeXpBucket[]> {
    const res = await fetch(`${API_BASE}/resources/life-xp`);
    if (!res.ok) throw new Error("Failed to fetch life xp buckets");
    return res.json();
}

export async function createLifeXpBucket(
    name: string,
    target_amount: number,
    is_repetitive?: boolean,
    contribution_frequency?: string,
    next_contribution_date?: string,
    notes?: string,
    custom_frequency_days?: number
): Promise<LifeXpBucket> {
    const res = await fetch(`${API_BASE}/resources/life-xp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, target_amount, is_repetitive, contribution_frequency, next_contribution_date, notes, custom_frequency_days }),
    });
    if (!res.ok) throw new Error("Failed to create bucket");
    return res.json();
}

export async function updateLifeXpBucket(
    id: number,
    name: string,
    target_amount: number,
    is_repetitive?: boolean,
    contribution_frequency?: string,
    next_contribution_date?: string,
    notes?: string,
    custom_frequency_days?: number
): Promise<LifeXpBucket> {
    const res = await fetch(`${API_BASE}/resources/life-xp/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, target_amount, is_repetitive, contribution_frequency, next_contribution_date, notes, custom_frequency_days }),
    });
    if (!res.ok) throw new Error("Failed to update bucket");
    return res.json();
}

export async function deleteLifeXpBucket(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/resources/life-xp/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete bucket");
}

export async function addContribution(id: number, amount: number, notes?: string): Promise<{ bucket: LifeXpBucket; history: LifeXpHistory }> {
    const res = await fetch(`${API_BASE}/resources/life-xp/${id}/contribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, notes }),
    });
    if (!res.ok) throw new Error("Failed to add contribution");
    return res.json();
}

export async function markBucketAchieved(id: number): Promise<LifeXpBucket> {
    const res = await fetch(`${API_BASE}/resources/life-xp/${id}/achieved`, {
        method: "POST",
    });
    if (!res.ok) throw new Error("Failed to mark as achieved");
    return res.json();
}

export async function reactivateBucket(id: number): Promise<LifeXpBucket> {
    const res = await fetch(`${API_BASE}/resources/life-xp/${id}/reactivate`, {
        method: "POST",
    });
    if (!res.ok) throw new Error("Failed to reactivate");
    return res.json();
}

export async function markContributionDone(id: number, amount: number, notes?: string): Promise<{ bucket: LifeXpBucket; history: LifeXpHistory }> {
    const res = await fetch(`${API_BASE}/resources/life-xp/${id}/mark-done`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, notes }),
    });
    if (!res.ok) throw new Error("Failed to mark contribution done");
    return res.json();
}

export async function fetchLifeXpHistory(bucketId: number): Promise<LifeXpHistory[]> {
    const res = await fetch(`${API_BASE}/resources/life-xp/${bucketId}/history`);
    if (!res.ok) throw new Error("Failed to fetch history");
    return res.json();
}

export async function updateLifeXpHistoryEntry(
    id: number,
    amount: number,
    notes?: string,
    date?: string
): Promise<LifeXpHistory> {
    const res = await fetch(`${API_BASE}/resources/life-xp-history/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, notes, date }),
    });
    if (!res.ok) throw new Error("Failed to update history entry");
    return res.json();
}

export async function deleteLifeXpHistoryEntry(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/resources/life-xp-history/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete history entry");
}

// Fixed Returns (FD, RD, etc.)
export interface FixedReturn {
    id: number;
    name: string;
    invested_amount: number;
    interest_rate: number; // Annual %
    start_date: string;
    maturity_date: string;
    expected_withdrawal: number;
    actual_withdrawal: number | null;
    status: 'ongoing' | 'closed';
    closed_date: string | null;
    notes?: string;
}

export interface FixedReturnsSummary {
    ongoing_count: number;
    total_invested: number;
    total_expected: number;
}

export async function fetchFixedReturns(): Promise<FixedReturn[]> {
    const res = await fetch(`${API_BASE}/resources/fixed-returns`);
    if (!res.ok) throw new Error("Failed to fetch fixed returns");
    return res.json();
}

export async function fetchFixedReturnsSummary(): Promise<FixedReturnsSummary> {
    const res = await fetch(`${API_BASE}/resources/fixed-returns/summary`);
    if (!res.ok) throw new Error("Failed to fetch summary");
    return res.json();
}

export async function createFixedReturn(
    name: string,
    invested_amount: number,
    interest_rate: number,
    start_date: string,
    maturity_date: string,
    notes?: string
): Promise<FixedReturn> {
    const res = await fetch(`${API_BASE}/resources/fixed-returns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, invested_amount, interest_rate, start_date, maturity_date, notes }),
    });
    if (!res.ok) throw new Error("Failed to create fixed return");
    return res.json();
}

export async function updateFixedReturn(
    id: number,
    name: string,
    invested_amount: number,
    interest_rate: number,
    start_date: string,
    maturity_date: string,
    notes?: string
): Promise<FixedReturn> {
    const res = await fetch(`${API_BASE}/resources/fixed-returns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, invested_amount, interest_rate, start_date, maturity_date, notes }),
    });
    if (!res.ok) throw new Error("Failed to update fixed return");
    return res.json();
}

export async function closeFixedReturn(
    id: number,
    actual_withdrawal: number,
    closed_date: string
): Promise<FixedReturn> {
    const res = await fetch(`${API_BASE}/resources/fixed-returns/${id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual_withdrawal, closed_date }),
    });
    if (!res.ok) throw new Error("Failed to close fixed return");
    return res.json();
}

export async function updateClosedFixedReturn(
    id: number,
    actual_withdrawal: number,
    closed_date: string,
    notes?: string
): Promise<FixedReturn> {
    const res = await fetch(`${API_BASE}/resources/fixed-returns/${id}/closed`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual_withdrawal, closed_date, notes }),
    });
    if (!res.ok) throw new Error("Failed to update closed fixed return");
    return res.json();
}

export async function deleteFixedReturn(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/resources/fixed-returns/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete fixed return");
}

// ===================== SIP / Mutual Funds =====================

export interface SIP {
    id: number;
    user_id: string;
    name: string;
    scheme_code: number | null; // mfapi.in scheme code for reliable NAV lookups
    sip_amount: number;
    start_date: string;
    total_units: number;
    current_nav: number;
    total_invested: number;
    current_value: number;
    returns_percent: number;
    status: 'ongoing' | 'paused' | 'redeemed';
    paused_date: string | null;
    redeemed_date: string | null;
    redeemed_amount: number | null;
    notes: string | null;
}

export interface SIPTransaction {
    id: number;
    sip_id: number;
    date: string;
    type: 'sip' | 'lumpsum' | 'nav_update' | 'partial_redeem';
    amount: number | null;
    nav: number | null;
    units: number | null;
    notes: string | null;
}

export interface SIPSummary {
    ongoing_count: number;
    total_invested: number;
    current_value: number;
}

export async function fetchSIPs(): Promise<SIP[]> {
    const res = await fetch(`${API_BASE}/resources/sips`);
    if (!res.ok) throw new Error("Failed to fetch SIPs");
    return res.json();
}

export async function fetchSIPSummary(): Promise<SIPSummary> {
    const res = await fetch(`${API_BASE}/resources/sips/summary`);
    if (!res.ok) throw new Error("Failed to fetch SIP summary");
    return res.json();
}

export async function createSIP(
    name: string,
    sip_amount: number,
    start_date: string,
    current_nav: number,
    notes?: string,
    scheme_code?: number,
    total_units?: number,
    invested_amount?: number,
    investment_type?: 'sip' | 'lumpsum'
): Promise<SIP> {
    const res = await fetch(`${API_BASE}/resources/sips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sip_amount, start_date, current_nav, notes, scheme_code, total_units, invested_amount, investment_type }),
    });
    if (!res.ok) throw new Error("Failed to create SIP");
    return res.json();
}

export async function updateSIP(
    id: number,
    name: string,
    sip_amount: number,
    notes?: string,
    start_date?: string,
    scheme_code?: number | null
): Promise<SIP> {
    const res = await fetch(`${API_BASE}/resources/sips/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sip_amount, notes, start_date, scheme_code }),
    });
    if (!res.ok) throw new Error("Failed to update SIP");
    return res.json();
}

export async function updateSIPNav(id: number, current_nav: number): Promise<SIP> {
    const res = await fetch(`${API_BASE}/resources/sips/${id}/nav`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_nav }),
    });
    if (!res.ok) throw new Error("Failed to update NAV");
    return res.json();
}

export async function updateSIPTotalUnits(id: number, total_units: number): Promise<SIP> {
    const res = await fetch(`${API_BASE}/resources/sips/${id}/units`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ total_units }),
    });
    if (!res.ok) throw new Error("Failed to update total units");
    return res.json();
}

export async function addSIPInstallment(
    id: number,
    amount: number,
    nav: number,
    date: string,
    type: 'sip' | 'lumpsum' = 'sip',
    notes?: string
): Promise<SIP> {
    const res = await fetch(`${API_BASE}/resources/sips/${id}/installment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, nav, date, type, notes }),
    });
    if (!res.ok) throw new Error("Failed to add installment");
    return res.json();
}

export async function pauseSIP(id: number): Promise<SIP> {
    const res = await fetch(`${API_BASE}/resources/sips/${id}/pause`, {
        method: "POST",
    });
    if (!res.ok) throw new Error("Failed to pause SIP");
    return res.json();
}

export async function resumeSIP(id: number): Promise<SIP> {
    const res = await fetch(`${API_BASE}/resources/sips/${id}/resume`, {
        method: "POST",
    });
    if (!res.ok) throw new Error("Failed to resume SIP");
    return res.json();
}

export async function redeemSIP(
    id: number,
    redeemed_amount: number,
    redeemed_date: string
): Promise<SIP> {
    const res = await fetch(`${API_BASE}/resources/sips/${id}/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redeemed_amount, redeemed_date }),
    });
    if (!res.ok) throw new Error("Failed to redeem SIP");
    return res.json();
}

export async function deleteSIP(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/resources/sips/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete SIP");
}

export async function fetchSIPTransactions(id: number): Promise<SIPTransaction[]> {
    const res = await fetch(`${API_BASE}/resources/sips/${id}/transactions`);
    if (!res.ok) throw new Error("Failed to fetch SIP transactions");
    return res.json();
}

// ===================== Recurring Deposits =====================

export interface RecurringDeposit {
    id: number;
    user_id: string;
    name: string;
    installment_amount: number;
    frequency: 'monthly' | 'yearly' | 'custom';
    custom_frequency_days: number | null;
    interest_rate: number; // Annual %
    start_date: string;
    total_installments: number;
    installments_paid: number;
    installments_remaining: number; // Calculated
    total_invested: number; // Calculated
    next_due_date: string | null;
    maturity_value: number;
    status: 'ongoing' | 'completed' | 'closed';
    closed_date: string | null;
    actual_withdrawal: number | null;
    notes: string | null;
}

export interface RDSummary {
    ongoing_count: number;
    total_invested: number;
    total_maturity: number;
}

export async function fetchRecurringDeposits(): Promise<RecurringDeposit[]> {
    const res = await fetch(`${API_BASE}/resources/recurring-deposits`);
    if (!res.ok) throw new Error("Failed to fetch recurring deposits");
    return res.json();
}

export async function fetchRDSummary(): Promise<RDSummary> {
    const res = await fetch(`${API_BASE}/resources/recurring-deposits/summary`);
    if (!res.ok) throw new Error("Failed to fetch RD summary");
    return res.json();
}

export async function createRecurringDeposit(
    name: string,
    installment_amount: number,
    frequency: string,
    interest_rate: number,
    start_date: string,
    total_installments: number,
    custom_frequency_days?: number,
    notes?: string
): Promise<RecurringDeposit> {
    const res = await fetch(`${API_BASE}/resources/recurring-deposits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, installment_amount, frequency, interest_rate, start_date, total_installments, custom_frequency_days, notes }),
    });
    if (!res.ok) throw new Error("Failed to create recurring deposit");
    return res.json();
}

export async function updateRecurringDeposit(
    id: number,
    name: string,
    installment_amount: number,
    frequency: string,
    interest_rate: number,
    start_date: string,
    total_installments: number,
    custom_frequency_days?: number,
    notes?: string
): Promise<RecurringDeposit> {
    const res = await fetch(`${API_BASE}/resources/recurring-deposits/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, installment_amount, frequency, interest_rate, start_date, total_installments, custom_frequency_days, notes }),
    });
    if (!res.ok) throw new Error("Failed to update recurring deposit");
    return res.json();
}

export async function markRDInstallmentPaid(id: number): Promise<RecurringDeposit> {
    const res = await fetch(`${API_BASE}/resources/recurring-deposits/${id}/mark-paid`, {
        method: "POST",
    });
    if (!res.ok) throw new Error("Failed to mark installment paid");
    return res.json();
}

export async function closeRecurringDeposit(
    id: number,
    actual_withdrawal: number,
    closed_date: string
): Promise<RecurringDeposit> {
    const res = await fetch(`${API_BASE}/resources/recurring-deposits/${id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual_withdrawal, closed_date }),
    });
    if (!res.ok) throw new Error("Failed to close recurring deposit");
    return res.json();
}

export async function deleteRecurringDeposit(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/resources/recurring-deposits/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete recurring deposit");
}

// ===================== Stocks & Crypto =====================

export type StockMarket = 'indian' | 'us' | 'crypto';

export interface Stock {
    id: number;
    user_id: string;
    market: StockMarket;
    symbol: string;
    name: string;
    quantity: number;
    buy_price: number;
    buy_date: string;
    current_price: number;
    price_updated_at: string | null;
    invested_value: number;
    current_value: number;
    profit_loss: number;
    profit_loss_percent: number;
    status: 'holding' | 'sold';
    sell_price: number | null;
    sell_date: string | null;
    notes: string | null;
}

export interface StocksSummary {
    holding_count: number;
    total_invested: number;
    current_value: number;
}

export async function fetchStocks(market: StockMarket, tileId?: string): Promise<Stock[]> {
    const url = tileId
        ? `${API_BASE}/resources/stocks/${market}?tile_id=${encodeURIComponent(tileId)}`
        : `${API_BASE}/resources/stocks/${market}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch stocks");
    return res.json();
}

export async function fetchStocksSummary(market: StockMarket, tileId?: string): Promise<StocksSummary> {
    const url = tileId
        ? `${API_BASE}/resources/stocks/${market}/summary?tile_id=${encodeURIComponent(tileId)}`
        : `${API_BASE}/resources/stocks/${market}/summary`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch stocks summary");
    return res.json();
}

export async function createStock(
    market: StockMarket,
    symbol: string,
    name: string,
    quantity: number,
    invested_value: number,
    buy_date?: string,
    current_price?: number,
    notes?: string,
    tileId?: string
): Promise<Stock> {
    const res = await fetch(`${API_BASE}/resources/stocks/${market}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, name, quantity, invested_value, buy_date, current_price, notes, tile_id: tileId }),
    });
    if (!res.ok) throw new Error("Failed to create stock");
    return res.json();
}

export async function updateStock(
    id: number,
    symbol: string,
    name: string,
    quantity: number,
    invested_value: number,
    buy_date: string,
    notes?: string,
    current_price?: number
): Promise<Stock> {
    const res = await fetch(`${API_BASE}/resources/stocks/item/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, name, quantity, invested_value, buy_date, notes, current_price }),
    });
    if (!res.ok) throw new Error("Failed to update stock");
    return res.json();
}

export async function updateStockPrice(id: number, current_price: number): Promise<Stock> {
    const res = await fetch(`${API_BASE}/resources/stocks/item/${id}/price`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_price }),
    });
    if (!res.ok) throw new Error("Failed to update stock price");
    return res.json();
}

export async function sellStock(id: number, sell_price: number, sell_date: string): Promise<Stock> {
    const res = await fetch(`${API_BASE}/resources/stocks/item/${id}/sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sell_price, sell_date }),
    });
    if (!res.ok) throw new Error("Failed to sell stock");
    return res.json();
}

export async function deleteStock(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/resources/stocks/item/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete stock");
}
