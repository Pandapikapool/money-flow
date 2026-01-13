import { Request, Response } from "express";
import { getUserId } from "../../core/userContext";
import * as repo from "./resources.repo";

// Accounts
export async function listAccounts(req: Request, res: Response) {
    try {
        const data = await repo.listAccounts(getUserId());
        res.json(data);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function createAccount(req: Request, res: Response) {
    try {
        const { name, balance } = req.body;
        if (!name) return res.status(400).json({ error: "Name is required" });

        // Create account
        const account = await repo.createAccount(getUserId(), name, Number(balance || 0));

        // Initial history entry
        const today = new Date().toISOString().split('T')[0];
        await repo.addAccountHistory(account.id, today, account.balance, "Initial Balance");

        res.status(201).json(account);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function updateAccount(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { balance, notes } = req.body;

        if (balance === undefined) return res.status(400).json({ error: "Balance is required" });

        const account = await repo.updateAccount(getUserId(), Number(id), Number(balance), notes);
        if (!account) return res.status(404).json({ error: "Account not found" });

        res.json(account);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function deleteAccount(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const success = await repo.deleteAccount(getUserId(), Number(id)); // Repo handles cascade via FK
        if (!success) return res.status(404).json({ error: "Account not found" });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// History
export async function getAccountHistory(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const history = await repo.getAccountHistory(Number(id));
        res.json(history);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function createHistoryEntry(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { date, balance, notes } = req.body;

        if (!date || balance === undefined) return res.status(400).json({ error: "Date and Balance are required" });

        const entry = await repo.addAccountHistory(Number(id), date, Number(balance), notes);
        res.status(201).json(entry);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function updateHistoryEntry(req: Request, res: Response) {
    try {
        const { id } = req.params; // history id
        const { balance, notes, date } = req.body;

        if (balance === undefined) return res.status(400).json({ error: "Balance is required" });

        const entry = await repo.updateAccountHistory(Number(id), Number(balance), notes, date);
        if (!entry) return res.status(404).json({ error: "History entry not found" });

        // Note: If this was the *latest* entry, we might want to update the main account balance too.
        // But for now, we treat history edits as historical corrections primarily. 
        // Users should use the main edit for "today".

        res.json(entry);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function deleteHistoryEntry(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const success = await repo.deleteAccountHistory(Number(id));
        if (!success) return res.status(404).json({ error: "History entry not found" });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// Assets
export async function listAssets(req: Request, res: Response) {
    try {
        const { type } = req.query;
        const data = await repo.listAssets(getUserId(), type as string);
        res.json(data);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function createAsset(req: Request, res: Response) {
    try {
        const { name, value, type, notes } = req.body;
        if (!name || !type) return res.status(400).json({ error: "Name and Type are required" });

        const asset = await repo.createAsset(getUserId(), name, Number(value || 0), type, notes);
        res.status(201).json(asset);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function updateAsset(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { value, notes } = req.body;

        if (value === undefined) return res.status(400).json({ error: "Value is required" });

        const asset = await repo.updateAssetWithHistory(getUserId(), Number(id), Number(value), notes);
        if (!asset) return res.status(404).json({ error: "Asset not found" });

        res.json(asset);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function deleteAsset(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const success = await repo.deleteAsset(getUserId(), Number(id));
        if (!success) return res.status(404).json({ error: "Asset not found" });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// Asset History
export async function getAssetHistory(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const history = await repo.getAssetHistory(Number(id));
        res.json(history);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function createAssetHistoryEntry(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { date, value, notes } = req.body;

        if (!date || value === undefined) return res.status(400).json({ error: "Date and Value are required" });

        const entry = await repo.addAssetHistory(Number(id), date, Number(value), notes);
        res.status(201).json(entry);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function updateAssetHistoryEntry(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { value, notes, date } = req.body;

        if (value === undefined) return res.status(400).json({ error: "Value is required" });

        const entry = await repo.updateAssetHistory(Number(id), Number(value), notes, date);
        if (!entry) return res.status(404).json({ error: "History entry not found" });

        res.json(entry);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function deleteAssetHistoryEntry(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const success = await repo.deleteAssetHistory(Number(id));
        if (!success) return res.status(404).json({ error: "History entry not found" });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// Plans
export async function listPlans(req: Request, res: Response) {
    try {
        const data = await repo.listPlans(getUserId());
        res.json(data);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function createPlan(req: Request, res: Response) {
    try {
        const { name, cover_amount, premium_amount, premium_frequency, expiry_date, next_premium_date, notes, custom_frequency_days } = req.body;
        if (!name) return res.status(400).json({ error: "Name is required" });

        const plan = await repo.createPlan(
            getUserId(),
            name,
            Number(cover_amount || 0),
            Number(premium_amount || 0),
            premium_frequency || 'yearly',
            expiry_date,
            next_premium_date,
            notes,
            custom_frequency_days ? Number(custom_frequency_days) : undefined
        );

        // Initial history entry
        const today = new Date().toISOString().split('T')[0];
        await repo.addPlanHistory(plan.id, today, plan.cover_amount, plan.premium_amount, "Initial entry");

        res.status(201).json(plan);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function updatePlan(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { cover_amount, premium_amount, premium_frequency, expiry_date, next_premium_date, notes, custom_frequency_days } = req.body;

        if (cover_amount === undefined) return res.status(400).json({ error: "Cover amount is required" });

        const plan = await repo.updatePlan(
            getUserId(),
            Number(id),
            Number(cover_amount),
            Number(premium_amount || 0),
            premium_frequency || 'yearly',
            expiry_date,
            next_premium_date,
            notes,
            custom_frequency_days ? Number(custom_frequency_days) : undefined
        );
        if (!plan) return res.status(404).json({ error: "Plan not found" });

        res.json(plan);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function deletePlan(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const success = await repo.deletePlan(getUserId(), Number(id));
        if (!success) return res.status(404).json({ error: "Plan not found" });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// Plan History
export async function getPlanHistory(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const history = await repo.getPlanHistory(Number(id));
        res.json(history);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function createPlanHistoryEntry(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { date, cover_amount, premium_amount, notes } = req.body;

        if (!date || cover_amount === undefined) return res.status(400).json({ error: "Date and Cover amount are required" });

        const entry = await repo.addPlanHistory(Number(id), date, Number(cover_amount), Number(premium_amount || 0), notes);
        res.status(201).json(entry);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function updatePlanHistoryEntry(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { cover_amount, premium_amount, notes, date } = req.body;

        if (cover_amount === undefined) return res.status(400).json({ error: "Cover amount is required" });

        const entry = await repo.updatePlanHistory(Number(id), Number(cover_amount), Number(premium_amount || 0), notes, date);
        if (!entry) return res.status(404).json({ error: "History entry not found" });

        res.json(entry);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function deletePlanHistoryEntry(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const success = await repo.deletePlanHistory(Number(id));
        if (!success) return res.status(404).json({ error: "History entry not found" });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// Life XP Buckets
export async function listLifeXpBuckets(req: Request, res: Response) {
    try {
        const data = await repo.listLifeXpBuckets(getUserId());
        res.json(data);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function createLifeXpBucket(req: Request, res: Response) {
    try {
        const { name, target_amount, is_repetitive, contribution_frequency, next_contribution_date, notes, custom_frequency_days } = req.body;
        if (!name) return res.status(400).json({ error: "Name is required" });

        const bucket = await repo.createLifeXpBucket(
            getUserId(),
            name,
            Number(target_amount || 0),
            is_repetitive || false,
            contribution_frequency,
            next_contribution_date,
            notes,
            custom_frequency_days ? Number(custom_frequency_days) : undefined
        );

        res.status(201).json(bucket);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function updateLifeXpBucket(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { target_amount, is_repetitive, contribution_frequency, next_contribution_date, notes, custom_frequency_days } = req.body;

        if (target_amount === undefined) return res.status(400).json({ error: "Target amount is required" });

        const bucket = await repo.updateLifeXpBucket(
            getUserId(),
            Number(id),
            Number(target_amount),
            is_repetitive || false,
            contribution_frequency,
            next_contribution_date,
            notes,
            custom_frequency_days ? Number(custom_frequency_days) : undefined
        );
        if (!bucket) return res.status(404).json({ error: "Bucket not found" });

        res.json(bucket);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function addContribution(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { amount, notes } = req.body;

        if (amount === undefined) return res.status(400).json({ error: "Amount is required" });

        const result = await repo.addContribution(getUserId(), Number(id), Number(amount), notes);
        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function markBucketAchieved(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const bucket = await repo.markBucketAchieved(getUserId(), Number(id));
        if (!bucket) return res.status(404).json({ error: "Bucket not found" });
        res.json(bucket);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function reactivateBucket(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const bucket = await repo.reactivateBucket(getUserId(), Number(id));
        if (!bucket) return res.status(404).json({ error: "Bucket not found" });
        res.json(bucket);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function deleteLifeXpBucket(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const success = await repo.deleteLifeXpBucket(getUserId(), Number(id));
        if (!success) return res.status(404).json({ error: "Bucket not found" });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function getLifeXpHistory(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const history = await repo.getLifeXpHistory(Number(id));
        res.json(history);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function updateLifeXpHistoryEntry(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { amount, notes, date } = req.body;

        if (amount === undefined) return res.status(400).json({ error: "Amount is required" });

        const entry = await repo.updateLifeXpHistory(Number(id), Number(amount), notes, date);
        if (!entry) return res.status(404).json({ error: "History entry not found" });

        res.json(entry);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function deleteLifeXpHistoryEntry(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const success = await repo.deleteLifeXpHistory(Number(id));
        if (!success) return res.status(404).json({ error: "History entry not found" });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function markContributionDone(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { amount, notes } = req.body;

        if (amount === undefined) return res.status(400).json({ error: "Amount is required" });

        const result = await repo.markContributionDone(getUserId(), Number(id), Number(amount), notes);
        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// Fixed Returns
export async function listFixedReturns(req: Request, res: Response) {
    try {
        const data = await repo.listFixedReturns(getUserId());
        res.json(data);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function getFixedReturnsSummary(req: Request, res: Response) {
    try {
        const summary = await repo.getFixedReturnsSummary(getUserId());
        res.json(summary);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function createFixedReturn(req: Request, res: Response) {
    try {
        const { name, invested_amount, interest_rate, start_date, maturity_date, notes } = req.body;

        if (!name || invested_amount === undefined || interest_rate === undefined || !start_date || !maturity_date) {
            return res.status(400).json({ error: "Name, invested amount, interest rate, start date, and maturity date are required" });
        }

        const item = await repo.createFixedReturn(
            getUserId(),
            name,
            Number(invested_amount),
            Number(interest_rate),
            start_date,
            maturity_date,
            notes
        );

        res.status(201).json(item);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function updateFixedReturn(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { name, invested_amount, interest_rate, start_date, maturity_date, notes } = req.body;

        if (!name || invested_amount === undefined || interest_rate === undefined || !start_date || !maturity_date) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const item = await repo.updateFixedReturn(
            getUserId(),
            Number(id),
            name,
            Number(invested_amount),
            Number(interest_rate),
            start_date,
            maturity_date,
            notes
        );
        if (!item) return res.status(404).json({ error: "Fixed return not found or already closed" });

        res.json(item);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function closeFixedReturn(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { actual_withdrawal, closed_date } = req.body;

        if (actual_withdrawal === undefined || !closed_date) {
            return res.status(400).json({ error: "Actual withdrawal and closed date are required" });
        }

        const item = await repo.closeFixedReturn(
            getUserId(),
            Number(id),
            Number(actual_withdrawal),
            closed_date
        );
        if (!item) return res.status(404).json({ error: "Fixed return not found" });

        res.json(item);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function updateClosedFixedReturn(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { actual_withdrawal, closed_date, notes } = req.body;

        if (actual_withdrawal === undefined || !closed_date) {
            return res.status(400).json({ error: "Actual withdrawal and closed date are required" });
        }

        const item = await repo.updateClosedFixedReturn(
            getUserId(),
            Number(id),
            Number(actual_withdrawal),
            closed_date,
            notes
        );
        if (!item) return res.status(404).json({ error: "Closed fixed return not found" });

        res.json(item);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function deleteFixedReturn(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const success = await repo.deleteFixedReturn(getUserId(), Number(id));
        if (!success) return res.status(404).json({ error: "Fixed return not found" });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// ===================== SIP / Mutual Funds =====================

export async function listSIPs(req: Request, res: Response) {
    try {
        const items = await repo.listSIPs(getUserId());
        res.json(items);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function getSIPSummary(req: Request, res: Response) {
    try {
        const summary = await repo.getSIPSummary(getUserId());
        res.json(summary);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function createSIP(req: Request, res: Response) {
    try {
        const { name, sip_amount, start_date, current_nav, notes, scheme_code } = req.body;

        if (!name || sip_amount === undefined || !start_date || current_nav === undefined) {
            return res.status(400).json({ error: "Name, SIP amount, start date, and current NAV are required" });
        }

        const item = await repo.createSIP(
            getUserId(),
            name,
            Number(sip_amount),
            start_date,
            Number(current_nav),
            notes,
            scheme_code ? Number(scheme_code) : undefined
        );
        res.status(201).json(item);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function updateSIP(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { name, sip_amount, notes, start_date, scheme_code } = req.body;

        if (!name || sip_amount === undefined) {
            return res.status(400).json({ error: "Name and SIP amount are required" });
        }

        const item = await repo.updateSIP(
            getUserId(),
            Number(id),
            name,
            Number(sip_amount),
            notes,
            start_date,
            scheme_code !== undefined ? (scheme_code ? Number(scheme_code) : null) : undefined
        );
        if (!item) return res.status(404).json({ error: "SIP not found or already redeemed" });

        res.json(item);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function updateSIPNav(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { current_nav } = req.body;

        if (current_nav === undefined) {
            return res.status(400).json({ error: "Current NAV is required" });
        }

        const item = await repo.updateSIPNav(
            getUserId(),
            Number(id),
            Number(current_nav)
        );
        if (!item) return res.status(404).json({ error: "SIP not found" });

        res.json(item);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function addSIPInstallment(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { amount, nav, date, type, notes } = req.body;

        if (amount === undefined || nav === undefined || !date) {
            return res.status(400).json({ error: "Amount, NAV, and date are required" });
        }

        const item = await repo.addSIPInstallment(
            getUserId(),
            Number(id),
            Number(amount),
            Number(nav),
            date,
            type || 'sip',
            notes
        );
        if (!item) return res.status(404).json({ error: "SIP not found or already redeemed" });

        res.json(item);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function pauseSIP(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const item = await repo.pauseSIP(getUserId(), Number(id));
        if (!item) return res.status(404).json({ error: "SIP not found or not ongoing" });
        res.json(item);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function resumeSIP(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const item = await repo.resumeSIP(getUserId(), Number(id));
        if (!item) return res.status(404).json({ error: "SIP not found or not paused" });
        res.json(item);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function redeemSIP(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { redeemed_amount, redeemed_date } = req.body;

        if (redeemed_amount === undefined || !redeemed_date) {
            return res.status(400).json({ error: "Redeemed amount and date are required" });
        }

        const item = await repo.redeemSIP(
            getUserId(),
            Number(id),
            Number(redeemed_amount),
            redeemed_date
        );
        if (!item) return res.status(404).json({ error: "SIP not found or already redeemed" });

        res.json(item);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function deleteSIP(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const success = await repo.deleteSIP(getUserId(), Number(id));
        if (!success) return res.status(404).json({ error: "SIP not found" });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function getSIPTransactions(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const transactions = await repo.getSIPTransactions(Number(id));
        res.json(transactions);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// ===================== Recurring Deposits =====================

export async function listRecurringDeposits(req: Request, res: Response) {
    try {
        const items = await repo.listRecurringDeposits(getUserId());
        res.json(items);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function getRDSummary(req: Request, res: Response) {
    try {
        const summary = await repo.getRDSummary(getUserId());
        res.json(summary);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function createRecurringDeposit(req: Request, res: Response) {
    try {
        const { name, installment_amount, frequency, interest_rate, start_date, total_installments, custom_frequency_days, notes } = req.body;

        if (!name || installment_amount === undefined || !frequency || interest_rate === undefined || !start_date || total_installments === undefined) {
            return res.status(400).json({ error: "Name, installment amount, frequency, interest rate, start date, and total installments are required" });
        }

        const item = await repo.createRecurringDeposit(
            getUserId(),
            name,
            Number(installment_amount),
            frequency,
            Number(interest_rate),
            start_date,
            Number(total_installments),
            custom_frequency_days ? Number(custom_frequency_days) : undefined,
            notes
        );
        res.status(201).json(item);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function updateRecurringDeposit(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { name, installment_amount, frequency, interest_rate, start_date, total_installments, custom_frequency_days, notes } = req.body;

        if (!name || installment_amount === undefined || !frequency || interest_rate === undefined || !start_date || total_installments === undefined) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const item = await repo.updateRecurringDeposit(
            getUserId(),
            Number(id),
            name,
            Number(installment_amount),
            frequency,
            Number(interest_rate),
            start_date,
            Number(total_installments),
            custom_frequency_days ? Number(custom_frequency_days) : undefined,
            notes
        );
        if (!item) return res.status(404).json({ error: "Recurring deposit not found or not ongoing" });

        res.json(item);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function markRDInstallmentPaid(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const item = await repo.markRDInstallmentPaid(getUserId(), Number(id));
        if (!item) return res.status(404).json({ error: "Recurring deposit not found or not ongoing" });
        res.json(item);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function closeRecurringDeposit(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { actual_withdrawal, closed_date } = req.body;

        if (actual_withdrawal === undefined || !closed_date) {
            return res.status(400).json({ error: "Actual withdrawal and closed date are required" });
        }

        const item = await repo.closeRecurringDeposit(
            getUserId(),
            Number(id),
            Number(actual_withdrawal),
            closed_date
        );
        if (!item) return res.status(404).json({ error: "Recurring deposit not found" });

        res.json(item);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function deleteRecurringDeposit(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const success = await repo.deleteRecurringDeposit(getUserId(), Number(id));
        if (!success) return res.status(404).json({ error: "Recurring deposit not found" });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// ===================== Stocks & Crypto =====================

export async function listStocks(req: Request, res: Response) {
    try {
        const { market } = req.params;
        const tileId = req.query.tile_id as string | undefined;
        if (!['indian', 'us', 'crypto'].includes(market)) {
            return res.status(400).json({ error: "Invalid market. Must be 'indian', 'us', or 'crypto'" });
        }
        const items = await repo.listStocks(getUserId(), market as repo.StockMarket, tileId);
        res.json(items);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function getStocksSummary(req: Request, res: Response) {
    try {
        const { market } = req.params;
        const tileId = req.query.tile_id as string | undefined;
        if (!['indian', 'us', 'crypto'].includes(market)) {
            return res.status(400).json({ error: "Invalid market" });
        }
        const summary = await repo.getStocksSummary(getUserId(), market as repo.StockMarket, tileId);
        res.json(summary);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function createStock(req: Request, res: Response) {
    try {
        const { market } = req.params;
        const { symbol, name, quantity, buy_price, buy_date, current_price, notes, tile_id } = req.body;

        if (!['indian', 'us', 'crypto'].includes(market)) {
            return res.status(400).json({ error: "Invalid market" });
        }
        if (!symbol || !name || quantity === undefined || buy_price === undefined || !buy_date) {
            return res.status(400).json({ error: "Symbol, name, quantity, buy price, and buy date are required" });
        }

        const item = await repo.createStock(
            getUserId(),
            market as repo.StockMarket,
            symbol,
            name,
            Number(quantity),
            Number(buy_price),
            buy_date,
            current_price !== undefined ? Number(current_price) : undefined,
            notes,
            tile_id
        );
        res.status(201).json(item);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function updateStock(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { symbol, name, quantity, buy_price, buy_date, notes } = req.body;

        if (!symbol || !name || quantity === undefined || buy_price === undefined || !buy_date) {
            return res.status(400).json({ error: "Symbol, name, quantity, buy price, and buy date are required" });
        }

        const item = await repo.updateStock(
            getUserId(),
            Number(id),
            symbol,
            name,
            Number(quantity),
            Number(buy_price),
            buy_date,
            notes
        );
        if (!item) return res.status(404).json({ error: "Stock not found or already sold" });

        res.json(item);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function updateStockPrice(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { current_price } = req.body;

        if (current_price === undefined) {
            return res.status(400).json({ error: "Current price is required" });
        }

        const item = await repo.updateStockPrice(getUserId(), Number(id), Number(current_price));
        if (!item) return res.status(404).json({ error: "Stock not found" });

        res.json(item);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function sellStock(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { sell_price, sell_date } = req.body;

        if (sell_price === undefined || !sell_date) {
            return res.status(400).json({ error: "Sell price and sell date are required" });
        }

        const item = await repo.sellStock(getUserId(), Number(id), Number(sell_price), sell_date);
        if (!item) return res.status(404).json({ error: "Stock not found or already sold" });

        res.json(item);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function deleteStock(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const success = await repo.deleteStock(getUserId(), Number(id));
        if (!success) return res.status(404).json({ error: "Stock not found" });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
