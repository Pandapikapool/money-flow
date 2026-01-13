import { pool } from "../../core/db";

export interface Account {
    id: number;
    user_id: string;
    name: string;
    balance: number;
    notes?: string;
    updated_at: string;
}

export interface Asset {
    id: number;
    user_id: string;
    name: string;
    value: number;
    type: string; // 'asset', 'investment', 'plan', 'life_xp'
    notes?: string;
    updated_at: string;
}

export interface AccountHistory {
    id: number;
    account_id: number;
    date: string; // YYYY-MM-DD
    balance: number;
    notes?: string;
}

export async function getAccountHistory(accountId: number): Promise<AccountHistory[]> {
    const res = await pool.query(
        "SELECT * FROM account_history WHERE account_id = $1 ORDER BY date ASC",
        [accountId]
    );
    return res.rows.map(r => ({
        ...r,
        date: r.date.toISOString().split('T')[0], // Ensure YYYY-MM-DD
        balance: Number(r.balance)
    }));
}

export async function deleteAccount(userId: string, id: number): Promise<boolean> {
    const res = await pool.query("DELETE FROM accounts WHERE id = $1 AND user_id = $2", [id, userId]);
    return (res.rowCount || 0) > 0;
}

export async function deleteAccountHistory(id: number): Promise<boolean> {
    const res = await pool.query("DELETE FROM account_history WHERE id = $1", [id]);
    return (res.rowCount || 0) > 0;
}

export async function addAccountHistory(accountId: number, date: string, balance: number, notes?: string): Promise<AccountHistory> {
    const res = await pool.query(
        `INSERT INTO account_history (account_id, date, balance, notes)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (account_id, date) DO UPDATE SET balance = EXCLUDED.balance, notes = EXCLUDED.notes
     RETURNING *`,
        [accountId, date, balance, notes]
    );
    const row = res.rows[0];
    return { ...row, date: row.date.toISOString().split('T')[0], balance: Number(row.balance) };
}

export async function updateAccountHistory(id: number, balance: number, notes?: string, date?: string): Promise<AccountHistory | null> {
    let query: string;
    let params: any[];

    if (date) {
        query = "UPDATE account_history SET balance = $1, notes = $2, date = $3 WHERE id = $4 RETURNING *";
        params = [balance, notes, date, id];
    } else {
        query = "UPDATE account_history SET balance = $1, notes = $2 WHERE id = $3 RETURNING *";
        params = [balance, notes, id];
    }

    const res = await pool.query(query, params);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return { ...row, date: row.date.toISOString().split('T')[0], balance: Number(row.balance) };
}

// Global "Types" that map to tables
type ResourceTable = 'accounts' | 'assets';

export async function listAccounts(userId: string): Promise<Account[]> {
    const res = await pool.query("SELECT * FROM accounts WHERE user_id = $1 ORDER BY name ASC", [userId]);
    return res.rows.map(r => ({ ...r, balance: Number(r.balance) }));
}

export async function updateAccount(userId: string, id: number, balance: number, notes?: string): Promise<Account | null> {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const res = await client.query(
            "UPDATE accounts SET balance = $1, notes = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING *",
            [balance, notes, id, userId]
        );

        if (res.rows.length === 0) {
            await client.query("ROLLBACK");
            return null;
        }

        // Also track in history for today
        const today = new Date().toISOString().split('T')[0];
        await client.query(
            `INSERT INTO account_history (account_id, date, balance, notes)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (account_id, date) DO UPDATE SET balance = EXCLUDED.balance, notes = EXCLUDED.notes`,
            [id, today, balance, notes]
        );

        await client.query("COMMIT");
        const row = res.rows[0];
        return { ...row, balance: Number(row.balance) };
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally {
        client.release();
    }
}

export async function createAccount(userId: string, name: string, balance: number): Promise<Account> {
    const res = await pool.query(
        "INSERT INTO accounts (user_id, name, balance) VALUES ($1, $2, $3) RETURNING *",
        [userId, name, balance]
    );
    const row = res.rows[0];
    return { ...row, balance: Number(row.balance) };
}

export async function listAssets(userId: string, type?: string): Promise<Asset[]> {
    let query = "SELECT * FROM assets WHERE user_id = $1";
    const params: any[] = [userId];

    if (type) {
        query += " AND type = $2";
        params.push(type);
    }

    query += " ORDER BY name ASC";
    const res = await pool.query(query, params);
    return res.rows.map(r => ({ ...r, value: Number(r.value) }));
}

export async function createAsset(userId: string, name: string, value: number, type: string, notes?: string): Promise<Asset> {
    const res = await pool.query(
        "INSERT INTO assets (user_id, name, value, type, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [userId, name, value, type, notes]
    );
    const row = res.rows[0];
    return { ...row, value: Number(row.value) };
}

export async function updateAsset(userId: string, id: number, name: string, value: number, notes?: string): Promise<Asset | null> {
    const res = await pool.query(
        "UPDATE assets SET name = $1, value = $2, notes = $3, updated_at = NOW() WHERE id = $4 AND user_id = $5 RETURNING *",
        [name, value, notes, id, userId]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return { ...row, value: Number(row.value) };
}

export async function deleteAsset(userId: string, id: number): Promise<boolean> {
    const res = await pool.query("DELETE FROM assets WHERE id = $1 AND user_id = $2", [id, userId]);
    return (res.rowCount || 0) > 0;
}

// Asset History
export interface AssetHistory {
    id: number;
    asset_id: number;
    date: string;
    value: number;
    notes?: string;
}

export async function getAssetHistory(assetId: number): Promise<AssetHistory[]> {
    const res = await pool.query(
        "SELECT * FROM asset_history WHERE asset_id = $1 ORDER BY date ASC",
        [assetId]
    );
    return res.rows.map(r => ({
        ...r,
        date: r.date.toISOString().split('T')[0],
        value: Number(r.value)
    }));
}

export async function addAssetHistory(assetId: number, date: string, value: number, notes?: string): Promise<AssetHistory> {
    const res = await pool.query(
        `INSERT INTO asset_history (asset_id, date, value, notes)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (asset_id, date) DO UPDATE SET value = EXCLUDED.value, notes = EXCLUDED.notes
         RETURNING *`,
        [assetId, date, value, notes]
    );
    const row = res.rows[0];
    return { ...row, date: row.date.toISOString().split('T')[0], value: Number(row.value) };
}

export async function updateAssetHistory(id: number, value: number, notes?: string, date?: string): Promise<AssetHistory | null> {
    let query: string;
    let params: any[];

    if (date) {
        query = "UPDATE asset_history SET value = $1, notes = $2, date = $3 WHERE id = $4 RETURNING *";
        params = [value, notes, date, id];
    } else {
        query = "UPDATE asset_history SET value = $1, notes = $2 WHERE id = $3 RETURNING *";
        params = [value, notes, id];
    }

    const res = await pool.query(query, params);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return { ...row, date: row.date.toISOString().split('T')[0], value: Number(row.value) };
}

export async function deleteAssetHistory(id: number): Promise<boolean> {
    const res = await pool.query("DELETE FROM asset_history WHERE id = $1", [id]);
    return (res.rowCount || 0) > 0;
}

// Update asset with history tracking
export async function updateAssetWithHistory(userId: string, id: number, name: string, value: number, notes?: string): Promise<Asset | null> {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const res = await client.query(
            "UPDATE assets SET name = $1, value = $2, notes = $3, updated_at = NOW() WHERE id = $4 AND user_id = $5 RETURNING *",
            [name, value, notes, id, userId]
        );

        if (res.rows.length === 0) {
            await client.query("ROLLBACK");
            return null;
        }

        // Also track in history for today
        const today = new Date().toISOString().split('T')[0];
        await client.query(
            `INSERT INTO asset_history (asset_id, date, value, notes)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (asset_id, date) DO UPDATE SET value = EXCLUDED.value, notes = EXCLUDED.notes`,
            [id, today, value, notes]
        );

        await client.query("COMMIT");
        const row = res.rows[0];
        return { ...row, value: Number(row.value) };
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally {
        client.release();
    }
}

// Plans (Insurance, Cover Plans)
export interface Plan {
    id: number;
    user_id: string;
    name: string;
    cover_amount: number;
    premium_amount: number;
    premium_frequency: string; // 'monthly', 'quarterly', 'half_yearly', 'yearly'
    expiry_date: string | null;
    next_premium_date: string | null; // When next premium is due
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface PlanHistory {
    id: number;
    plan_id: number;
    date: string;
    cover_amount: number;
    premium_amount: number;
    notes?: string;
}

export async function listPlans(userId: string): Promise<Plan[]> {
    const res = await pool.query("SELECT * FROM plans WHERE user_id = $1 ORDER BY name ASC", [userId]);
    return res.rows.map(r => ({
        ...r,
        cover_amount: Number(r.cover_amount),
        premium_amount: Number(r.premium_amount),
        custom_frequency_days: r.custom_frequency_days ? Number(r.custom_frequency_days) : null,
        expiry_date: r.expiry_date ? r.expiry_date.toISOString().split('T')[0] : null,
        next_premium_date: r.next_premium_date ? r.next_premium_date.toISOString().split('T')[0] : null
    }));
}

export async function createPlan(
    userId: string,
    name: string,
    coverAmount: number,
    premiumAmount: number,
    premiumFrequency: string,
    expiryDate?: string,
    nextPremiumDate?: string,
    notes?: string,
    customFrequencyDays?: number
): Promise<Plan> {
    const res = await pool.query(
        `INSERT INTO plans (user_id, name, cover_amount, premium_amount, premium_frequency, custom_frequency_days, expiry_date, next_premium_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [userId, name, coverAmount, premiumAmount, premiumFrequency, customFrequencyDays || null, expiryDate || null, nextPremiumDate || null, notes]
    );
    const row = res.rows[0];
    return {
        ...row,
        cover_amount: Number(row.cover_amount),
        premium_amount: Number(row.premium_amount),
        custom_frequency_days: row.custom_frequency_days ? Number(row.custom_frequency_days) : null,
        expiry_date: row.expiry_date ? row.expiry_date.toISOString().split('T')[0] : null,
        next_premium_date: row.next_premium_date ? row.next_premium_date.toISOString().split('T')[0] : null
    };
}

export async function updatePlan(
    userId: string,
    id: number,
    name: string,
    coverAmount: number,
    premiumAmount: number,
    premiumFrequency: string,
    expiryDate?: string,
    nextPremiumDate?: string,
    notes?: string,
    customFrequencyDays?: number
): Promise<Plan | null> {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const res = await client.query(
            `UPDATE plans SET name = $1, cover_amount = $2, premium_amount = $3, premium_frequency = $4,
             custom_frequency_days = $5, expiry_date = $6, next_premium_date = $7, notes = $8, updated_at = NOW()
             WHERE id = $9 AND user_id = $10 RETURNING *`,
            [name, coverAmount, premiumAmount, premiumFrequency, customFrequencyDays || null, expiryDate || null, nextPremiumDate || null, notes, id, userId]
        );

        if (res.rows.length === 0) {
            await client.query("ROLLBACK");
            return null;
        }

        // Track in history for today
        const today = new Date().toISOString().split('T')[0];
        await client.query(
            `INSERT INTO plan_history (plan_id, date, cover_amount, premium_amount, notes)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (plan_id, date) DO UPDATE SET
             cover_amount = EXCLUDED.cover_amount, premium_amount = EXCLUDED.premium_amount, notes = EXCLUDED.notes`,
            [id, today, coverAmount, premiumAmount, notes]
        );

        await client.query("COMMIT");
        const row = res.rows[0];
        return {
            ...row,
            cover_amount: Number(row.cover_amount),
            premium_amount: Number(row.premium_amount),
            custom_frequency_days: row.custom_frequency_days ? Number(row.custom_frequency_days) : null,
            expiry_date: row.expiry_date ? row.expiry_date.toISOString().split('T')[0] : null,
            next_premium_date: row.next_premium_date ? row.next_premium_date.toISOString().split('T')[0] : null
        };
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally {
        client.release();
    }
}

export async function deletePlan(userId: string, id: number): Promise<boolean> {
    const res = await pool.query("DELETE FROM plans WHERE id = $1 AND user_id = $2", [id, userId]);
    return (res.rowCount || 0) > 0;
}

// Plan History
export async function getPlanHistory(planId: number): Promise<PlanHistory[]> {
    const res = await pool.query(
        "SELECT * FROM plan_history WHERE plan_id = $1 ORDER BY date ASC",
        [planId]
    );
    return res.rows.map(r => ({
        ...r,
        date: r.date.toISOString().split('T')[0],
        cover_amount: Number(r.cover_amount),
        premium_amount: Number(r.premium_amount)
    }));
}

export async function addPlanHistory(
    planId: number,
    date: string,
    coverAmount: number,
    premiumAmount: number,
    notes?: string
): Promise<PlanHistory> {
    const res = await pool.query(
        `INSERT INTO plan_history (plan_id, date, cover_amount, premium_amount, notes)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (plan_id, date) DO UPDATE SET
         cover_amount = EXCLUDED.cover_amount, premium_amount = EXCLUDED.premium_amount, notes = EXCLUDED.notes
         RETURNING *`,
        [planId, date, coverAmount, premiumAmount, notes]
    );
    const row = res.rows[0];
    return {
        ...row,
        date: row.date.toISOString().split('T')[0],
        cover_amount: Number(row.cover_amount),
        premium_amount: Number(row.premium_amount)
    };
}

export async function updatePlanHistory(
    id: number,
    coverAmount: number,
    premiumAmount: number,
    notes?: string,
    date?: string
): Promise<PlanHistory | null> {
    let query: string;
    let params: any[];

    if (date) {
        query = `UPDATE plan_history SET cover_amount = $1, premium_amount = $2, notes = $3, date = $4
                 WHERE id = $5 RETURNING *`;
        params = [coverAmount, premiumAmount, notes, date, id];
    } else {
        query = `UPDATE plan_history SET cover_amount = $1, premium_amount = $2, notes = $3
                 WHERE id = $4 RETURNING *`;
        params = [coverAmount, premiumAmount, notes, id];
    }

    const res = await pool.query(query, params);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
        ...row,
        date: row.date.toISOString().split('T')[0],
        cover_amount: Number(row.cover_amount),
        premium_amount: Number(row.premium_amount)
    };
}

export async function deletePlanHistory(id: number): Promise<boolean> {
    const res = await pool.query("DELETE FROM plan_history WHERE id = $1", [id]);
    return (res.rowCount || 0) > 0;
}

// Life XP Buckets (Savings Goals)
export interface LifeXpBucket {
    id: number;
    user_id: string;
    name: string;
    target_amount: number;
    saved_amount: number;
    is_repetitive: boolean;
    contribution_frequency: string | null; // 'monthly', 'quarterly', 'yearly', 'custom'
    custom_frequency_days: number | null; // Only used when contribution_frequency = 'custom'
    next_contribution_date: string | null;
    status: string; // 'active', 'achieved', 'archived'
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface LifeXpHistory {
    id: number;
    bucket_id: number;
    date: string;
    amount: number;
    total_saved: number;
    notes?: string;
}

export async function listLifeXpBuckets(userId: string): Promise<LifeXpBucket[]> {
    const res = await pool.query(
        "SELECT * FROM life_xp_buckets WHERE user_id = $1 ORDER BY status ASC, name ASC",
        [userId]
    );
    return res.rows.map(r => ({
        ...r,
        target_amount: Number(r.target_amount),
        saved_amount: Number(r.saved_amount),
        custom_frequency_days: r.custom_frequency_days ? Number(r.custom_frequency_days) : null,
        next_contribution_date: r.next_contribution_date ? r.next_contribution_date.toISOString().split('T')[0] : null
    }));
}

export async function createLifeXpBucket(
    userId: string,
    name: string,
    targetAmount: number,
    isRepetitive: boolean = false,
    contributionFrequency?: string,
    nextContributionDate?: string,
    notes?: string,
    customFrequencyDays?: number
): Promise<LifeXpBucket> {
    const res = await pool.query(
        `INSERT INTO life_xp_buckets (user_id, name, target_amount, saved_amount, is_repetitive, contribution_frequency, custom_frequency_days, next_contribution_date, notes)
         VALUES ($1, $2, $3, 0, $4, $5, $6, $7, $8) RETURNING *`,
        [userId, name, targetAmount, isRepetitive, contributionFrequency || null, customFrequencyDays || null, nextContributionDate || null, notes]
    );
    const row = res.rows[0];
    return {
        ...row,
        target_amount: Number(row.target_amount),
        saved_amount: Number(row.saved_amount),
        custom_frequency_days: row.custom_frequency_days ? Number(row.custom_frequency_days) : null,
        next_contribution_date: row.next_contribution_date ? row.next_contribution_date.toISOString().split('T')[0] : null
    };
}

export async function updateLifeXpBucket(
    userId: string,
    id: number,
    name: string,
    targetAmount: number,
    isRepetitive: boolean,
    contributionFrequency?: string,
    nextContributionDate?: string,
    notes?: string,
    customFrequencyDays?: number
): Promise<LifeXpBucket | null> {
    const res = await pool.query(
        `UPDATE life_xp_buckets SET name = $1, target_amount = $2, is_repetitive = $3, contribution_frequency = $4,
         custom_frequency_days = $5, next_contribution_date = $6, notes = $7, updated_at = NOW()
         WHERE id = $8 AND user_id = $9 RETURNING *`,
        [name, targetAmount, isRepetitive, contributionFrequency || null, customFrequencyDays || null, nextContributionDate || null, notes, id, userId]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
        ...row,
        target_amount: Number(row.target_amount),
        saved_amount: Number(row.saved_amount),
        custom_frequency_days: row.custom_frequency_days ? Number(row.custom_frequency_days) : null,
        next_contribution_date: row.next_contribution_date ? row.next_contribution_date.toISOString().split('T')[0] : null
    };
}

export async function addContribution(
    userId: string,
    bucketId: number,
    amount: number,
    notes?: string
): Promise<{ bucket: LifeXpBucket; history: LifeXpHistory }> {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Get current bucket
        const bucketRes = await client.query(
            "SELECT * FROM life_xp_buckets WHERE id = $1 AND user_id = $2",
            [bucketId, userId]
        );
        if (bucketRes.rows.length === 0) {
            throw new Error("Bucket not found");
        }

        const currentSaved = Number(bucketRes.rows[0].saved_amount);
        const newSaved = currentSaved + amount;

        // Update saved amount
        const updateRes = await client.query(
            "UPDATE life_xp_buckets SET saved_amount = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
            [newSaved, bucketId]
        );

        // Add history entry
        const today = new Date().toISOString().split('T')[0];
        const historyRes = await client.query(
            `INSERT INTO life_xp_history (bucket_id, date, amount, total_saved, notes)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [bucketId, today, amount, newSaved, notes]
        );

        await client.query("COMMIT");

        const bucketRow = updateRes.rows[0];
        const historyRow = historyRes.rows[0];

        return {
            bucket: {
                ...bucketRow,
                target_amount: Number(bucketRow.target_amount),
                saved_amount: Number(bucketRow.saved_amount),
                next_contribution_date: bucketRow.next_contribution_date ? bucketRow.next_contribution_date.toISOString().split('T')[0] : null
            },
            history: {
                ...historyRow,
                date: historyRow.date.toISOString().split('T')[0],
                amount: Number(historyRow.amount),
                total_saved: Number(historyRow.total_saved)
            }
        };
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally {
        client.release();
    }
}

export async function markBucketAchieved(userId: string, id: number): Promise<LifeXpBucket | null> {
    const res = await pool.query(
        "UPDATE life_xp_buckets SET status = 'achieved', updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *",
        [id, userId]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
        ...row,
        target_amount: Number(row.target_amount),
        saved_amount: Number(row.saved_amount),
        next_contribution_date: row.next_contribution_date ? row.next_contribution_date.toISOString().split('T')[0] : null
    };
}

export async function reactivateBucket(userId: string, id: number): Promise<LifeXpBucket | null> {
    const res = await pool.query(
        "UPDATE life_xp_buckets SET status = 'active', updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *",
        [id, userId]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
        ...row,
        target_amount: Number(row.target_amount),
        saved_amount: Number(row.saved_amount),
        next_contribution_date: row.next_contribution_date ? row.next_contribution_date.toISOString().split('T')[0] : null
    };
}

export async function deleteLifeXpBucket(userId: string, id: number): Promise<boolean> {
    const res = await pool.query("DELETE FROM life_xp_buckets WHERE id = $1 AND user_id = $2", [id, userId]);
    return (res.rowCount || 0) > 0;
}

export async function getLifeXpHistory(bucketId: number): Promise<LifeXpHistory[]> {
    const res = await pool.query(
        "SELECT * FROM life_xp_history WHERE bucket_id = $1 ORDER BY date ASC, id ASC",
        [bucketId]
    );
    return res.rows.map(r => ({
        ...r,
        date: r.date.toISOString().split('T')[0],
        amount: Number(r.amount),
        total_saved: Number(r.total_saved)
    }));
}

export async function updateLifeXpHistory(
    id: number,
    amount: number,
    notes?: string,
    date?: string
): Promise<LifeXpHistory | null> {
    let query: string;
    let params: any[];

    if (date) {
        query = `UPDATE life_xp_history SET amount = $1, notes = $2, date = $3 WHERE id = $4 RETURNING *`;
        params = [amount, notes, date, id];
    } else {
        query = `UPDATE life_xp_history SET amount = $1, notes = $2 WHERE id = $3 RETURNING *`;
        params = [amount, notes, id];
    }

    const res = await pool.query(query, params);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
        ...row,
        date: row.date.toISOString().split('T')[0],
        amount: Number(row.amount),
        total_saved: Number(row.total_saved)
    };
}

export async function deleteLifeXpHistory(id: number): Promise<boolean> {
    const res = await pool.query("DELETE FROM life_xp_history WHERE id = $1", [id]);
    return (res.rowCount || 0) > 0;
}

// Mark contribution as done and advance next date
export async function markContributionDone(
    userId: string,
    bucketId: number,
    contributionAmount: number,
    notes?: string
): Promise<{ bucket: LifeXpBucket; history: LifeXpHistory }> {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Get current bucket
        const bucketRes = await client.query(
            "SELECT * FROM life_xp_buckets WHERE id = $1 AND user_id = $2",
            [bucketId, userId]
        );
        if (bucketRes.rows.length === 0) {
            throw new Error("Bucket not found");
        }

        const bucket = bucketRes.rows[0];
        const currentSaved = Number(bucket.saved_amount);
        const newSaved = currentSaved + contributionAmount;

        // Calculate next contribution date if repetitive
        let nextDate = bucket.next_contribution_date;
        if (bucket.is_repetitive && bucket.contribution_frequency && bucket.next_contribution_date) {
            const current = new Date(bucket.next_contribution_date);
            switch (bucket.contribution_frequency) {
                case 'monthly':
                    current.setMonth(current.getMonth() + 1);
                    break;
                case 'quarterly':
                    current.setMonth(current.getMonth() + 3);
                    break;
                case 'yearly':
                    current.setFullYear(current.getFullYear() + 1);
                    break;
                case 'custom':
                    if (bucket.custom_frequency_days) {
                        current.setDate(current.getDate() + Number(bucket.custom_frequency_days));
                    }
                    break;
            }
            nextDate = current.toISOString().split('T')[0];
        }

        // Update bucket
        const updateRes = await client.query(
            `UPDATE life_xp_buckets SET saved_amount = $1, next_contribution_date = $2, updated_at = NOW()
             WHERE id = $3 RETURNING *`,
            [newSaved, nextDate, bucketId]
        );

        // Add history entry
        const today = new Date().toISOString().split('T')[0];
        const historyRes = await client.query(
            `INSERT INTO life_xp_history (bucket_id, date, amount, total_saved, notes)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [bucketId, today, contributionAmount, newSaved, notes]
        );

        await client.query("COMMIT");

        const bucketRow = updateRes.rows[0];
        const historyRow = historyRes.rows[0];

        return {
            bucket: {
                ...bucketRow,
                target_amount: Number(bucketRow.target_amount),
                saved_amount: Number(bucketRow.saved_amount),
                next_contribution_date: bucketRow.next_contribution_date ? bucketRow.next_contribution_date.toISOString().split('T')[0] : null
            },
            history: {
                ...historyRow,
                date: historyRow.date.toISOString().split('T')[0],
                amount: Number(historyRow.amount),
                total_saved: Number(historyRow.total_saved)
            }
        };
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally {
        client.release();
    }
}

// Fixed Returns (FD, RD, etc.)
export interface FixedReturn {
    id: number;
    user_id: string;
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
    created_at: string;
    updated_at: string;
}

// Helper to calculate expected withdrawal using simple interest
function calculateExpectedWithdrawal(principal: number, ratePercent: number, startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
    // Simple interest: A = P(1 + rt)
    return principal * (1 + (ratePercent / 100) * years);
}

// Helper to back-calculate interest rate from withdrawal and principal
function calculateInterestRate(principal: number, withdrawal: number, startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
    if (years <= 0 || principal <= 0) return 0;
    // r = (A/P - 1) / t
    return ((withdrawal / principal) - 1) / years * 100;
}

export async function listFixedReturns(userId: string): Promise<FixedReturn[]> {
    const res = await pool.query(
        "SELECT * FROM fixed_returns WHERE user_id = $1 ORDER BY status ASC, maturity_date ASC",
        [userId]
    );
    return res.rows.map(r => ({
        ...r,
        invested_amount: Number(r.invested_amount),
        interest_rate: Number(r.interest_rate),
        expected_withdrawal: Number(r.expected_withdrawal),
        actual_withdrawal: r.actual_withdrawal ? Number(r.actual_withdrawal) : null,
        start_date: r.start_date.toISOString().split('T')[0],
        maturity_date: r.maturity_date.toISOString().split('T')[0],
        closed_date: r.closed_date ? r.closed_date.toISOString().split('T')[0] : null
    }));
}

export async function createFixedReturn(
    userId: string,
    name: string,
    investedAmount: number,
    interestRate: number,
    startDate: string,
    maturityDate: string,
    notes?: string
): Promise<FixedReturn> {
    const expectedWithdrawal = calculateExpectedWithdrawal(investedAmount, interestRate, startDate, maturityDate);

    const res = await pool.query(
        `INSERT INTO fixed_returns (user_id, name, invested_amount, interest_rate, start_date, maturity_date, expected_withdrawal, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [userId, name, investedAmount, interestRate, startDate, maturityDate, expectedWithdrawal, notes]
    );
    const row = res.rows[0];
    return {
        ...row,
        invested_amount: Number(row.invested_amount),
        interest_rate: Number(row.interest_rate),
        expected_withdrawal: Number(row.expected_withdrawal),
        actual_withdrawal: row.actual_withdrawal ? Number(row.actual_withdrawal) : null,
        start_date: row.start_date.toISOString().split('T')[0],
        maturity_date: row.maturity_date.toISOString().split('T')[0],
        closed_date: row.closed_date ? row.closed_date.toISOString().split('T')[0] : null
    };
}

export async function updateFixedReturn(
    userId: string,
    id: number,
    name: string,
    investedAmount: number,
    interestRate: number,
    startDate: string,
    maturityDate: string,
    notes?: string
): Promise<FixedReturn | null> {
    const expectedWithdrawal = calculateExpectedWithdrawal(investedAmount, interestRate, startDate, maturityDate);

    const res = await pool.query(
        `UPDATE fixed_returns SET name = $1, invested_amount = $2, interest_rate = $3,
         start_date = $4, maturity_date = $5, expected_withdrawal = $6, notes = $7, updated_at = NOW()
         WHERE id = $8 AND user_id = $9 AND status = 'ongoing' RETURNING *`,
        [name, investedAmount, interestRate, startDate, maturityDate, expectedWithdrawal, notes, id, userId]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
        ...row,
        invested_amount: Number(row.invested_amount),
        interest_rate: Number(row.interest_rate),
        expected_withdrawal: Number(row.expected_withdrawal),
        actual_withdrawal: row.actual_withdrawal ? Number(row.actual_withdrawal) : null,
        start_date: row.start_date.toISOString().split('T')[0],
        maturity_date: row.maturity_date.toISOString().split('T')[0],
        closed_date: row.closed_date ? row.closed_date.toISOString().split('T')[0] : null
    };
}

export async function closeFixedReturn(
    userId: string,
    id: number,
    actualWithdrawal: number,
    closedDate: string
): Promise<FixedReturn | null> {
    // Get the existing record to recalculate interest rate
    const existing = await pool.query(
        "SELECT * FROM fixed_returns WHERE id = $1 AND user_id = $2",
        [id, userId]
    );
    if (existing.rows.length === 0) return null;

    const row = existing.rows[0];
    const investedAmount = Number(row.invested_amount);
    const startDate = row.start_date.toISOString().split('T')[0];

    // Back-calculate actual interest rate based on actual withdrawal
    const actualInterestRate = calculateInterestRate(investedAmount, actualWithdrawal, startDate, closedDate);

    const res = await pool.query(
        `UPDATE fixed_returns SET status = 'closed', actual_withdrawal = $1, closed_date = $2,
         interest_rate = $3, updated_at = NOW()
         WHERE id = $4 AND user_id = $5 RETURNING *`,
        [actualWithdrawal, closedDate, actualInterestRate, id, userId]
    );
    if (res.rows.length === 0) return null;
    const updatedRow = res.rows[0];
    return {
        ...updatedRow,
        invested_amount: Number(updatedRow.invested_amount),
        interest_rate: Number(updatedRow.interest_rate),
        expected_withdrawal: Number(updatedRow.expected_withdrawal),
        actual_withdrawal: updatedRow.actual_withdrawal ? Number(updatedRow.actual_withdrawal) : null,
        start_date: updatedRow.start_date.toISOString().split('T')[0],
        maturity_date: updatedRow.maturity_date.toISOString().split('T')[0],
        closed_date: updatedRow.closed_date ? updatedRow.closed_date.toISOString().split('T')[0] : null
    };
}

export async function updateClosedFixedReturn(
    userId: string,
    id: number,
    actualWithdrawal: number,
    closedDate: string,
    notes?: string
): Promise<FixedReturn | null> {
    // Get the existing record
    const existing = await pool.query(
        "SELECT * FROM fixed_returns WHERE id = $1 AND user_id = $2 AND status = 'closed'",
        [id, userId]
    );
    if (existing.rows.length === 0) return null;

    const row = existing.rows[0];
    const investedAmount = Number(row.invested_amount);
    const startDate = row.start_date.toISOString().split('T')[0];

    // Back-calculate actual interest rate
    const actualInterestRate = calculateInterestRate(investedAmount, actualWithdrawal, startDate, closedDate);

    const res = await pool.query(
        `UPDATE fixed_returns SET actual_withdrawal = $1, closed_date = $2, interest_rate = $3, notes = $4, updated_at = NOW()
         WHERE id = $5 AND user_id = $6 RETURNING *`,
        [actualWithdrawal, closedDate, actualInterestRate, notes, id, userId]
    );
    if (res.rows.length === 0) return null;
    const updatedRow = res.rows[0];
    return {
        ...updatedRow,
        invested_amount: Number(updatedRow.invested_amount),
        interest_rate: Number(updatedRow.interest_rate),
        expected_withdrawal: Number(updatedRow.expected_withdrawal),
        actual_withdrawal: updatedRow.actual_withdrawal ? Number(updatedRow.actual_withdrawal) : null,
        start_date: updatedRow.start_date.toISOString().split('T')[0],
        maturity_date: updatedRow.maturity_date.toISOString().split('T')[0],
        closed_date: updatedRow.closed_date ? updatedRow.closed_date.toISOString().split('T')[0] : null
    };
}

export async function deleteFixedReturn(userId: string, id: number): Promise<boolean> {
    const res = await pool.query("DELETE FROM fixed_returns WHERE id = $1 AND user_id = $2", [id, userId]);
    return (res.rowCount || 0) > 0;
}

export async function getFixedReturnsSummary(userId: string): Promise<{ ongoing_count: number; total_invested: number; total_expected: number }> {
    const res = await pool.query(
        `SELECT COUNT(*) as ongoing_count,
                COALESCE(SUM(invested_amount), 0) as total_invested,
                COALESCE(SUM(expected_withdrawal), 0) as total_expected
         FROM fixed_returns WHERE user_id = $1 AND status = 'ongoing'`,
        [userId]
    );
    const row = res.rows[0];
    return {
        ongoing_count: Number(row.ongoing_count),
        total_invested: Number(row.total_invested),
        total_expected: Number(row.total_expected)
    };
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
    current_value: number; // Calculated: total_units * current_nav
    returns_percent: number; // Calculated: ((current_value - total_invested) / total_invested) * 100
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

function mapSIPRow(row: any): SIP {
    const totalUnits = Number(row.total_units);
    const currentNav = Number(row.current_nav);
    const totalInvested = Number(row.total_invested);
    const currentValue = totalUnits * currentNav;
    const returnsPercent = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0;

    return {
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        scheme_code: row.scheme_code ? Number(row.scheme_code) : null,
        sip_amount: Number(row.sip_amount),
        start_date: row.start_date.toISOString().split('T')[0],
        total_units: totalUnits,
        current_nav: currentNav,
        total_invested: totalInvested,
        current_value: currentValue,
        returns_percent: returnsPercent,
        status: row.status,
        paused_date: row.paused_date ? row.paused_date.toISOString().split('T')[0] : null,
        redeemed_date: row.redeemed_date ? row.redeemed_date.toISOString().split('T')[0] : null,
        redeemed_amount: row.redeemed_amount ? Number(row.redeemed_amount) : null,
        notes: row.notes
    };
}

function mapSIPTransactionRow(row: any): SIPTransaction {
    return {
        id: row.id,
        sip_id: row.sip_id,
        date: row.date.toISOString().split('T')[0],
        type: row.type,
        amount: row.amount ? Number(row.amount) : null,
        nav: row.nav ? Number(row.nav) : null,
        units: row.units ? Number(row.units) : null,
        notes: row.notes
    };
}

export async function listSIPs(userId: string): Promise<SIP[]> {
    const res = await pool.query(
        "SELECT * FROM sips WHERE user_id = $1 ORDER BY status ASC, name ASC",
        [userId]
    );
    return res.rows.map(mapSIPRow);
}

export async function createSIP(
    userId: string,
    name: string,
    sipAmount: number,
    startDate: string,
    currentNav: number,
    notes?: string,
    schemeCode?: number,
    totalUnits?: number,
    investedAmount?: number,
    investmentType?: 'sip' | 'lumpsum'
): Promise<SIP> {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Use provided invested_amount or default to sipAmount for backward compatibility
        const actualInvestedAmount = investedAmount !== undefined ? investedAmount : sipAmount;
        // Use provided total_units or calculate initial units from invested amount
        const initialUnits = totalUnits !== undefined ? totalUnits : (actualInvestedAmount / currentNav);
        // Determine transaction type
        const transactionType = investmentType || 'sip';
        const transactionNotes = transactionType === 'lumpsum' ? 'Initial lumpsum investment' : 'Initial SIP installment';

        // Create SIP with first installment already invested
        const res = await client.query(
            `INSERT INTO sips (user_id, name, scheme_code, sip_amount, start_date, current_nav, total_units, total_invested, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [userId, name, schemeCode || null, sipAmount, startDate, currentNav, initialUnits, actualInvestedAmount, notes]
        );

        const sipId = res.rows[0].id;

        // Record the first installment transaction
        await client.query(
            `INSERT INTO sip_transactions (sip_id, date, type, amount, nav, units, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [sipId, startDate, transactionType, actualInvestedAmount, currentNav, initialUnits, transactionNotes]
        );

        await client.query("COMMIT");
        return mapSIPRow(res.rows[0]);
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally {
        client.release();
    }
}

export async function updateSIP(
    userId: string,
    id: number,
    name: string,
    sipAmount: number,
    notes?: string,
    startDate?: string,
    schemeCode?: number | null
): Promise<SIP | null> {
    // Build dynamic update query based on provided fields
    let query = `UPDATE sips SET name = $1, sip_amount = $2, notes = $3, updated_at = NOW()`;
    const params: any[] = [name, sipAmount, notes];

    if (startDate) {
        query += `, start_date = $${params.length + 1}`;
        params.push(startDate);
    }

    if (schemeCode !== undefined) {
        query += `, scheme_code = $${params.length + 1}`;
        params.push(schemeCode);
    }

    query += ` WHERE id = $${params.length + 1} AND user_id = $${params.length + 2} AND status != 'redeemed' RETURNING *`;
    params.push(id, userId);

    const res = await pool.query(query, params);
    if (res.rows.length === 0) return null;
    return mapSIPRow(res.rows[0]);
}

export async function updateSIPNav(
    userId: string,
    id: number,
    currentNav: number
): Promise<SIP | null> {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const res = await client.query(
            `UPDATE sips SET current_nav = $1, updated_at = NOW()
             WHERE id = $2 AND user_id = $3 RETURNING *`,
            [currentNav, id, userId]
        );
        if (res.rows.length === 0) {
            await client.query("ROLLBACK");
            return null;
        }

        // Record the NAV update
        await client.query(
            `INSERT INTO sip_transactions (sip_id, date, type, nav, notes)
             VALUES ($1, CURRENT_DATE, 'nav_update', $2, 'NAV updated')`,
            [id, currentNav]
        );

        await client.query("COMMIT");
        return mapSIPRow(res.rows[0]);
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally {
        client.release();
    }
}

export async function updateSIPTotalUnits(
    userId: string,
    id: number,
    totalUnits: number
): Promise<SIP | null> {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const res = await client.query(
            `UPDATE sips SET total_units = $1, updated_at = NOW()
             WHERE id = $2 AND user_id = $3 RETURNING *`,
            [totalUnits, id, userId]
        );
        if (res.rows.length === 0) {
            await client.query("ROLLBACK");
            return null;
        }

        // Record the units update
        const row = res.rows[0];
        await client.query(
            `INSERT INTO sip_transactions (sip_id, date, type, nav, units, notes)
             VALUES ($1, CURRENT_DATE, 'nav_update', $2, $3, 'Total units updated')`,
            [id, Number(row.current_nav), totalUnits]
        );

        await client.query("COMMIT");
        return mapSIPRow(res.rows[0]);
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally {
        client.release();
    }
}

export async function addSIPInstallment(
    userId: string,
    id: number,
    amount: number,
    nav: number,
    date: string,
    type: 'sip' | 'lumpsum' = 'sip',
    notes?: string
): Promise<SIP | null> {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Calculate units bought
        const units = amount / nav;

        // Update SIP totals
        const res = await client.query(
            `UPDATE sips SET
                total_units = total_units + $1,
                total_invested = total_invested + $2,
                current_nav = $3,
                updated_at = NOW()
             WHERE id = $4 AND user_id = $5 AND status != 'redeemed' RETURNING *`,
            [units, amount, nav, id, userId]
        );
        if (res.rows.length === 0) {
            await client.query("ROLLBACK");
            return null;
        }

        // Record the transaction
        await client.query(
            `INSERT INTO sip_transactions (sip_id, date, type, amount, nav, units, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [id, date, type, amount, nav, units, notes]
        );

        await client.query("COMMIT");
        return mapSIPRow(res.rows[0]);
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally {
        client.release();
    }
}

export async function pauseSIP(userId: string, id: number): Promise<SIP | null> {
    const res = await pool.query(
        `UPDATE sips SET status = 'paused', paused_date = CURRENT_DATE, updated_at = NOW()
         WHERE id = $1 AND user_id = $2 AND status = 'ongoing' RETURNING *`,
        [id, userId]
    );
    if (res.rows.length === 0) return null;
    return mapSIPRow(res.rows[0]);
}

export async function resumeSIP(userId: string, id: number): Promise<SIP | null> {
    const res = await pool.query(
        `UPDATE sips SET status = 'ongoing', paused_date = NULL, updated_at = NOW()
         WHERE id = $1 AND user_id = $2 AND status = 'paused' RETURNING *`,
        [id, userId]
    );
    if (res.rows.length === 0) return null;
    return mapSIPRow(res.rows[0]);
}

export async function redeemSIP(
    userId: string,
    id: number,
    redeemedAmount: number,
    redeemedDate: string
): Promise<SIP | null> {
    const res = await pool.query(
        `UPDATE sips SET status = 'redeemed', redeemed_amount = $1, redeemed_date = $2, updated_at = NOW()
         WHERE id = $3 AND user_id = $4 AND status != 'redeemed' RETURNING *`,
        [redeemedAmount, redeemedDate, id, userId]
    );
    if (res.rows.length === 0) return null;
    return mapSIPRow(res.rows[0]);
}

export async function deleteSIP(userId: string, id: number): Promise<boolean> {
    const res = await pool.query("DELETE FROM sips WHERE id = $1 AND user_id = $2", [id, userId]);
    return (res.rowCount || 0) > 0;
}

export async function getSIPTransactions(sipId: number): Promise<SIPTransaction[]> {
    const res = await pool.query(
        "SELECT * FROM sip_transactions WHERE sip_id = $1 ORDER BY date DESC, id DESC",
        [sipId]
    );
    return res.rows.map(mapSIPTransactionRow);
}

export async function getSIPSummary(userId: string): Promise<{ ongoing_count: number; total_invested: number; current_value: number }> {
    const res = await pool.query(
        `SELECT COUNT(*) as ongoing_count,
                COALESCE(SUM(total_invested), 0) as total_invested,
                COALESCE(SUM(total_units * current_nav), 0) as current_value
         FROM sips WHERE user_id = $1 AND status IN ('ongoing', 'paused')`,
        [userId]
    );
    const row = res.rows[0];
    return {
        ongoing_count: Number(row.ongoing_count),
        total_invested: Number(row.total_invested),
        current_value: Number(row.current_value)
    };
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
    total_invested: number; // Calculated: installments_paid * installment_amount
    next_due_date: string | null;
    maturity_value: number;
    status: 'ongoing' | 'completed' | 'closed';
    closed_date: string | null;
    actual_withdrawal: number | null;
    notes: string | null;
}

// Helper to calculate maturity value for RD using compound interest formula
// M = R × [(1 + i)^n - 1] / i × (1 + i) where:
// R = installment amount, i = periodic interest rate, n = number of installments
function calculateRDMaturityValue(
    installmentAmount: number,
    interestRatePercent: number,
    frequency: string,
    totalInstallments: number,
    customFrequencyDays?: number
): number {
    // Determine installments per year based on frequency
    let installmentsPerYear: number;
    switch (frequency) {
        case 'monthly':
            installmentsPerYear = 12;
            break;
        case 'yearly':
            installmentsPerYear = 1;
            break;
        case 'custom':
            installmentsPerYear = customFrequencyDays ? 365 / customFrequencyDays : 12;
            break;
        default:
            installmentsPerYear = 12;
    }

    // Periodic interest rate
    const periodicRate = (interestRatePercent / 100) / installmentsPerYear;

    if (periodicRate === 0) {
        return installmentAmount * totalInstallments;
    }

    // Compound interest formula for recurring deposits
    const maturity = installmentAmount * ((Math.pow(1 + periodicRate, totalInstallments) - 1) / periodicRate) * (1 + periodicRate);
    return Math.round(maturity * 100) / 100; // Round to 2 decimal places
}

// Helper to calculate next due date
function calculateNextDueDate(
    startDate: string,
    frequency: string,
    installmentsPaid: number,
    customFrequencyDays?: number
): string {
    const start = new Date(startDate);
    let nextDate = new Date(start);

    switch (frequency) {
        case 'monthly':
            nextDate.setMonth(start.getMonth() + installmentsPaid);
            break;
        case 'yearly':
            nextDate.setFullYear(start.getFullYear() + installmentsPaid);
            break;
        case 'custom':
            if (customFrequencyDays) {
                nextDate.setDate(start.getDate() + (installmentsPaid * customFrequencyDays));
            }
            break;
    }

    return nextDate.toISOString().split('T')[0];
}

function mapRDRow(row: any): RecurringDeposit {
    const installmentsPaid = Number(row.installments_paid);
    const totalInstallments = Number(row.total_installments);
    const installmentAmount = Number(row.installment_amount);

    return {
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        installment_amount: installmentAmount,
        frequency: row.frequency,
        custom_frequency_days: row.custom_frequency_days ? Number(row.custom_frequency_days) : null,
        interest_rate: Number(row.interest_rate),
        start_date: row.start_date.toISOString().split('T')[0],
        total_installments: totalInstallments,
        installments_paid: installmentsPaid,
        installments_remaining: totalInstallments - installmentsPaid,
        total_invested: installmentsPaid * installmentAmount,
        next_due_date: row.next_due_date ? row.next_due_date.toISOString().split('T')[0] : null,
        maturity_value: Number(row.maturity_value),
        status: row.status,
        closed_date: row.closed_date ? row.closed_date.toISOString().split('T')[0] : null,
        actual_withdrawal: row.actual_withdrawal ? Number(row.actual_withdrawal) : null,
        notes: row.notes
    };
}

export async function listRecurringDeposits(userId: string): Promise<RecurringDeposit[]> {
    const res = await pool.query(
        "SELECT * FROM recurring_deposits WHERE user_id = $1 ORDER BY status ASC, next_due_date ASC NULLS LAST",
        [userId]
    );
    return res.rows.map(mapRDRow);
}

export async function createRecurringDeposit(
    userId: string,
    name: string,
    installmentAmount: number,
    frequency: string,
    interestRate: number,
    startDate: string,
    totalInstallments: number,
    customFrequencyDays?: number,
    notes?: string
): Promise<RecurringDeposit> {
    const maturityValue = calculateRDMaturityValue(
        installmentAmount,
        interestRate,
        frequency,
        totalInstallments,
        customFrequencyDays
    );
    const nextDueDate = startDate; // First installment is due on start date

    const res = await pool.query(
        `INSERT INTO recurring_deposits
         (user_id, name, installment_amount, frequency, custom_frequency_days, interest_rate, start_date, total_installments, next_due_date, maturity_value, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [userId, name, installmentAmount, frequency, customFrequencyDays || null, interestRate, startDate, totalInstallments, nextDueDate, maturityValue, notes]
    );
    return mapRDRow(res.rows[0]);
}

export async function updateRecurringDeposit(
    userId: string,
    id: number,
    name: string,
    installmentAmount: number,
    frequency: string,
    interestRate: number,
    startDate: string,
    totalInstallments: number,
    customFrequencyDays?: number,
    notes?: string
): Promise<RecurringDeposit | null> {
    // Get current installments_paid to preserve it
    const existing = await pool.query(
        "SELECT installments_paid FROM recurring_deposits WHERE id = $1 AND user_id = $2",
        [id, userId]
    );
    if (existing.rows.length === 0) return null;

    const installmentsPaid = Number(existing.rows[0].installments_paid);

    // Recalculate maturity value
    const maturityValue = calculateRDMaturityValue(
        installmentAmount,
        interestRate,
        frequency,
        totalInstallments,
        customFrequencyDays
    );

    // Recalculate next due date based on current payments
    const nextDueDate = calculateNextDueDate(startDate, frequency, installmentsPaid, customFrequencyDays);

    const res = await pool.query(
        `UPDATE recurring_deposits SET
         name = $1, installment_amount = $2, frequency = $3, custom_frequency_days = $4,
         interest_rate = $5, start_date = $6, total_installments = $7, next_due_date = $8,
         maturity_value = $9, notes = $10, updated_at = NOW()
         WHERE id = $11 AND user_id = $12 AND status = 'ongoing' RETURNING *`,
        [name, installmentAmount, frequency, customFrequencyDays || null, interestRate, startDate, totalInstallments, nextDueDate, maturityValue, notes, id, userId]
    );
    if (res.rows.length === 0) return null;
    return mapRDRow(res.rows[0]);
}

export async function markRDInstallmentPaid(userId: string, id: number): Promise<RecurringDeposit | null> {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Get current RD
        const existing = await client.query(
            "SELECT * FROM recurring_deposits WHERE id = $1 AND user_id = $2 AND status = 'ongoing'",
            [id, userId]
        );
        if (existing.rows.length === 0) {
            await client.query("ROLLBACK");
            return null;
        }

        const rd = existing.rows[0];
        const newPaidCount = Number(rd.installments_paid) + 1;
        const totalInstallments = Number(rd.total_installments);

        // Check if this completes the RD
        const newStatus = newPaidCount >= totalInstallments ? 'completed' : 'ongoing';

        // Calculate new next due date (null if completed)
        let newNextDueDate = null;
        if (newStatus === 'ongoing') {
            newNextDueDate = calculateNextDueDate(
                rd.start_date.toISOString().split('T')[0],
                rd.frequency,
                newPaidCount,
                rd.custom_frequency_days
            );
        }

        const res = await client.query(
            `UPDATE recurring_deposits SET
             installments_paid = $1, next_due_date = $2, status = $3, updated_at = NOW()
             WHERE id = $4 RETURNING *`,
            [newPaidCount, newNextDueDate, newStatus, id]
        );

        await client.query("COMMIT");
        return mapRDRow(res.rows[0]);
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally {
        client.release();
    }
}

export async function closeRecurringDeposit(
    userId: string,
    id: number,
    actualWithdrawal: number,
    closedDate: string
): Promise<RecurringDeposit | null> {
    const res = await pool.query(
        `UPDATE recurring_deposits SET
         status = 'closed', actual_withdrawal = $1, closed_date = $2, next_due_date = NULL, updated_at = NOW()
         WHERE id = $3 AND user_id = $4 RETURNING *`,
        [actualWithdrawal, closedDate, id, userId]
    );
    if (res.rows.length === 0) return null;
    return mapRDRow(res.rows[0]);
}

export async function deleteRecurringDeposit(userId: string, id: number): Promise<boolean> {
    const res = await pool.query("DELETE FROM recurring_deposits WHERE id = $1 AND user_id = $2", [id, userId]);
    return (res.rowCount || 0) > 0;
}

export async function getRDSummary(userId: string): Promise<{ ongoing_count: number; total_invested: number; total_maturity: number }> {
    const res = await pool.query(
        `SELECT COUNT(*) as ongoing_count,
                COALESCE(SUM(installments_paid * installment_amount), 0) as total_invested,
                COALESCE(SUM(maturity_value), 0) as total_maturity
         FROM recurring_deposits WHERE user_id = $1 AND status IN ('ongoing', 'completed')`,
        [userId]
    );
    const row = res.rows[0];
    return {
        ongoing_count: Number(row.ongoing_count),
        total_invested: Number(row.total_invested),
        total_maturity: Number(row.total_maturity)
    };
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
    invested_value: number; // Calculated: quantity * buy_price
    current_value: number; // Calculated: quantity * current_price
    profit_loss: number; // Calculated: current_value - invested_value
    profit_loss_percent: number; // Calculated
    status: 'holding' | 'sold';
    sell_price: number | null;
    sell_date: string | null;
    notes: string | null;
}

function mapStockRow(row: any): Stock {
    const quantity = Number(row.quantity);
    const buyPrice = Number(row.buy_price);
    const currentPrice = Number(row.current_price);
    const investedValue = quantity * buyPrice;
    const currentValue = quantity * currentPrice;
    const profitLoss = currentValue - investedValue;
    const profitLossPercent = investedValue > 0 ? (profitLoss / investedValue) * 100 : 0;

    return {
        id: row.id,
        user_id: row.user_id,
        market: row.market,
        symbol: row.symbol,
        name: row.name,
        quantity: quantity,
        buy_price: buyPrice,
        buy_date: row.buy_date.toISOString().split('T')[0],
        current_price: currentPrice,
        price_updated_at: row.price_updated_at ? row.price_updated_at.toISOString() : null,
        invested_value: investedValue,
        current_value: currentValue,
        profit_loss: profitLoss,
        profit_loss_percent: profitLossPercent,
        status: row.status,
        sell_price: row.sell_price ? Number(row.sell_price) : null,
        sell_date: row.sell_date ? row.sell_date.toISOString().split('T')[0] : null,
        notes: row.notes
    };
}

export async function listStocks(userId: string, market: StockMarket, tileId?: string): Promise<Stock[]> {
    const query = tileId
        ? "SELECT * FROM stocks WHERE user_id = $1 AND market = $2 AND tile_id = $3 ORDER BY status ASC, name ASC"
        : "SELECT * FROM stocks WHERE user_id = $1 AND market = $2 AND tile_id IS NULL ORDER BY status ASC, name ASC";
    const params = tileId ? [userId, market, tileId] : [userId, market];
    const res = await pool.query(query, params);
    return res.rows.map(mapStockRow);
}

export async function getStockById(userId: string, id: number): Promise<Stock | null> {
    const res = await pool.query(
        "SELECT * FROM stocks WHERE id = $1 AND user_id = $2",
        [id, userId]
    );
    if (res.rows.length === 0) return null;
    return mapStockRow(res.rows[0]);
}

export async function createStock(
    userId: string,
    market: StockMarket,
    symbol: string,
    name: string,
    quantity: number,
    investedValue: number,
    buyDate: string,
    currentPrice?: number,
    notes?: string,
    tileId?: string
): Promise<Stock> {
    // Calculate buy_price from invested_value and quantity
    const buyPrice = quantity > 0 ? investedValue / quantity : 0;
    // Use provided current_price or default to buy_price
    const price = currentPrice !== undefined ? currentPrice : buyPrice;
    // Use provided buyDate or default to today
    const actualBuyDate = buyDate || new Date().toISOString().split('T')[0];
    const res = await pool.query(
        `INSERT INTO stocks (user_id, market, tile_id, symbol, name, quantity, buy_price, buy_date, current_price, price_updated_at, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10) RETURNING *`,
        [userId, market, tileId || null, symbol.toUpperCase(), name, quantity, buyPrice, actualBuyDate, price, notes || null]
    );
    return mapStockRow(res.rows[0]);
}

export async function updateStock(
    userId: string,
    id: number,
    symbol: string,
    name: string,
    quantity: number,
    investedValue: number,
    buyDate: string,
    notes?: string,
    currentPrice?: number
): Promise<Stock | null> {
    // Calculate buy_price from invested_value and quantity
    const buyPrice = quantity > 0 ? investedValue / quantity : 0;
    const res = await pool.query(
        `UPDATE stocks SET symbol = $1, name = $2, quantity = $3, buy_price = $4, buy_date = $5, notes = $6, current_price = $7, price_updated_at = NOW(), updated_at = NOW()
         WHERE id = $8 AND user_id = $9 AND status = 'holding' RETURNING *`,
        [symbol.toUpperCase(), name, quantity, buyPrice, buyDate, notes, currentPrice !== undefined ? currentPrice : buyPrice, id, userId]
    );
    if (res.rows.length === 0) return null;
    return mapStockRow(res.rows[0]);
}

export async function updateStockPrice(
    userId: string,
    id: number,
    currentPrice: number
): Promise<Stock | null> {
    const res = await pool.query(
        `UPDATE stocks SET current_price = $1, price_updated_at = NOW(), updated_at = NOW()
         WHERE id = $2 AND user_id = $3 RETURNING *`,
        [currentPrice, id, userId]
    );
    if (res.rows.length === 0) return null;
    return mapStockRow(res.rows[0]);
}

export async function sellStock(
    userId: string,
    id: number,
    sellPrice: number,
    sellDate: string
): Promise<Stock | null> {
    const res = await pool.query(
        `UPDATE stocks SET status = 'sold', sell_price = $1, sell_date = $2, current_price = $1, updated_at = NOW()
         WHERE id = $3 AND user_id = $4 AND status = 'holding' RETURNING *`,
        [sellPrice, sellDate, id, userId]
    );
    if (res.rows.length === 0) return null;
    return mapStockRow(res.rows[0]);
}

export async function deleteStock(userId: string, id: number): Promise<boolean> {
    const res = await pool.query("DELETE FROM stocks WHERE id = $1 AND user_id = $2", [id, userId]);
    return (res.rowCount || 0) > 0;
}

export async function getStocksSummary(userId: string, market: StockMarket, tileId?: string): Promise<{
    holding_count: number;
    total_invested: number;
    current_value: number;
}> {
    const query = tileId
        ? `SELECT COUNT(*) as holding_count,
                COALESCE(SUM(quantity * buy_price), 0) as total_invested,
                COALESCE(SUM(quantity * current_price), 0) as current_value
           FROM stocks WHERE user_id = $1 AND market = $2 AND tile_id = $3 AND status = 'holding'`
        : `SELECT COUNT(*) as holding_count,
                COALESCE(SUM(quantity * buy_price), 0) as total_invested,
                COALESCE(SUM(quantity * current_price), 0) as current_value
           FROM stocks WHERE user_id = $1 AND market = $2 AND tile_id IS NULL AND status = 'holding'`;
    const params = tileId ? [userId, market, tileId] : [userId, market];
    const res = await pool.query(query, params);
    const row = res.rows[0];
    return {
        holding_count: Number(row.holding_count),
        total_invested: Number(row.total_invested),
        current_value: Number(row.current_value)
    };
}
