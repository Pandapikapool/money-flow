import * as XLSX from 'xlsx';
import {
    createTag, createSpecialTag, setBudget, createExpense, updateExpense,
    createAccount, createHistoryEntry,
    createAsset, createAssetHistoryEntry,
    createPlan, createPlanHistoryEntry,
    createLifeXpBucket, addContribution,
    createFixedReturn,
    createSIP, addSIPInstallment,
    createRecurringDeposit,
    createStock,
    fetchTags, fetchSpecialTags
} from './api';

export interface ImportResult {
    success: boolean;
    year?: number;
    counts: Record<string, number>;
    errors: string[];
}

const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

function getSheetRows(workbook: XLSX.WorkBook, sheetName: string): unknown[][] {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
    return aoa;
}

function num(val: unknown): number {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number' && !Number.isNaN(val)) return val;
    const n = Number(val);
    return Number.isNaN(n) ? 0 : n;
}

function str(val: unknown): string {
    if (val === null || val === undefined) return '';
    return String(val).trim();
}

function row(rowArr: unknown[], index: number): unknown {
    return rowArr[index] ?? '';
}

export async function importFromFile(file: File): Promise<ImportResult> {
    const counts: Record<string, number> = {};
    const errors: string[] = [];

    const buf = await file.arrayBuffer();
    const workbook = XLSX.read(buf, { type: 'array' });

    // Year from Summary sheet
    const summaryRows = getSheetRows(workbook, 'Summary');
    let year = new Date().getFullYear();
    if (summaryRows.length > 0 && summaryRows[0][0] === 'Year') {
        const y = num(summaryRows[0][1]);
        if (y >= 2000 && y <= 2100) year = y;
    }

    try {
        // 1. Tags
        const tagsRows = getSheetRows(workbook, 'Tags');
        const tagNameToId: Record<string, number> = {};
        for (let i = 1; i < tagsRows.length; i++) {
            const r = tagsRows[i];
            const name = str(row(r, 1));
            if (!name) continue;
            try {
                const pageType = str(row(r, 2)) || 'expense';
                const created = await createTag(name, pageType);
                tagNameToId[name] = created.id;
                counts['Tags'] = (counts['Tags'] || 0) + 1;
            } catch (e) {
                errors.push(`Tag "${name}": ${(e as Error).message}`);
            }
        }

        // 2. Special Tags
        const specialTagsRows = getSheetRows(workbook, 'Special Tags');
        const specialTagNameToId: Record<string, number> = {};
        for (let i = 1; i < specialTagsRows.length; i++) {
            const r = specialTagsRows[i];
            const name = str(row(r, 1));
            if (!name) continue;
            try {
                const created = await createSpecialTag(name);
                specialTagNameToId[name] = created.id;
                counts['Special Tags'] = (counts['Special Tags'] || 0) + 1;
            } catch (e) {
                errors.push(`Special tag "${name}": ${(e as Error).message}`);
            }
        }

        // 3. Budgets (Month = name or number, Amount)
        const budgetsRows = getSheetRows(workbook, 'Budgets');
        for (let i = 1; i < budgetsRows.length; i++) {
            const r = budgetsRows[i];
            const monthVal = str(row(r, 0));
            const amount = num(row(r, 1));
            if (amount === 0 && !monthVal) continue;
            let month = num(row(r, 0));
            if (Number.isNaN(month) || month < 1 || month > 12) {
                const idx = MONTH_NAMES.indexOf(monthVal.toLowerCase());
                month = idx >= 0 ? idx + 1 : 0;
            }
            if (month >= 1 && month <= 12) {
                try {
                    await setBudget(year, month, amount);
                    counts['Budgets'] = (counts['Budgets'] || 0) + 1;
                } catch (e) {
                    errors.push(`Budget ${month}: ${(e as Error).message}`);
                }
            }
        }

        // 4. Expenses (Date, Amount, Statement, Tag, Special Tags, Notes)
        const expensesRows = getSheetRows(workbook, 'Expenses');
        for (let i = 1; i < expensesRows.length; i++) {
            const r = expensesRows[i];
            const dateVal = str(row(r, 0));
            const amount = num(row(r, 1));
            const statement = str(row(r, 2));
            const tagName = str(row(r, 3));
            if (!dateVal || !statement || !tagName) continue;
            const tagId = tagName ? tagNameToId[tagName] : undefined;
            if (!tagId && tagName) {
                try {
                    const created = await createTag(tagName, 'expense');
                    tagNameToId[tagName] = created.id;
                } catch (e) {
                    errors.push(`Expense row ${i + 1} (tag "${tagName}"): ${(e as Error).message}`);
                    continue;
                }
            }
            const specialTagsStr = str(row(r, 4));
            const specialTagIds: number[] = [];
            if (specialTagsStr) {
                for (const name of specialTagsStr.split(',').map(s => s.trim()).filter(Boolean)) {
                    let id = specialTagNameToId[name];
                    if (!id) {
                        try {
                            const created = await createSpecialTag(name);
                            specialTagNameToId[name] = created.id;
                            id = created.id;
                        } catch (e) {
                            errors.push(`Expense row ${i + 1} (special tag "${name}"): ${(e as Error).message}`);
                        }
                        if (id) specialTagIds.push(id);
                    } else {
                        specialTagIds.push(id);
                    }
                }
            }
            const notes = str(row(r, 5));
            try {
                const created = await createExpense({
                    date: dateVal,
                    amount,
                    statement,
                    tag_id: tagNameToId[tagName] ?? 0,
                    special_tag_ids: specialTagIds.length ? specialTagIds : undefined,
                    notes: notes || undefined
                });
                if (specialTagIds.length > 0) {
                    await updateExpense(created.id, { special_tag_ids: specialTagIds });
                }
                counts['Expenses'] = (counts['Expenses'] || 0) + 1;
            } catch (e) {
                errors.push(`Expense row ${i + 1}: ${(e as Error).message}`);
            }
        }

        // 5. Accounts (Name, Balance, Notes) - skip ID column
        const accountsRows = getSheetRows(workbook, 'Accounts');
        const accountNameToId: Record<string, number> = {};
        for (let i = 1; i < accountsRows.length; i++) {
            const r = accountsRows[i];
            const name = str(row(r, 1));
            if (!name) continue;
            const balance = num(row(r, 2));
            try {
                const created = await createAccount(name, balance);
                accountNameToId[name] = created.id;
                counts['Accounts'] = (counts['Accounts'] || 0) + 1;
            } catch (e) {
                errors.push(`Account "${name}": ${(e as Error).message}`);
            }
        }

        // 6. Account History (Account Name, Date, Balance, Notes)
        const accountHistoryRows = getSheetRows(workbook, 'Account History');
        for (let i = 1; i < accountHistoryRows.length; i++) {
            const r = accountHistoryRows[i];
            const accountName = str(row(r, 1));
            const dateVal = str(row(r, 2));
            const balance = num(row(r, 3));
            if (!accountName || !dateVal) continue;
            const accountId = accountNameToId[accountName];
            if (!accountId) continue;
            try {
                await createHistoryEntry(accountId, dateVal, balance, str(row(r, 4)) || undefined);
                counts['Account History'] = (counts['Account History'] || 0) + 1;
            } catch (e) {
                errors.push(`Account history "${accountName}" ${dateVal}: ${(e as Error).message}`);
            }
        }

        // 7. Assets (Name, Type, Value, Notes) - col 0 = ID skip
        const assetsRows = getSheetRows(workbook, 'Assets');
        const assetNameToId: Record<string, number> = {};
        for (let i = 1; i < assetsRows.length; i++) {
            const r = assetsRows[i];
            const name = str(row(r, 1));
            if (!name) continue;
            const type = str(row(r, 2)) || 'asset';
            const value = num(row(r, 3));
            try {
                const created = await createAsset(name, value, type, str(row(r, 4)) || undefined);
                assetNameToId[name] = created.id;
                counts['Assets'] = (counts['Assets'] || 0) + 1;
            } catch (e) {
                errors.push(`Asset "${name}": ${(e as Error).message}`);
            }
        }

        // 8. Asset History
        const assetHistoryRows = getSheetRows(workbook, 'Asset History');
        for (let i = 1; i < assetHistoryRows.length; i++) {
            const r = assetHistoryRows[i];
            const assetName = str(row(r, 1));
            const dateVal = str(row(r, 2));
            const value = num(row(r, 3));
            if (!assetName || !dateVal) continue;
            const assetId = assetNameToId[assetName];
            if (!assetId) continue;
            try {
                await createAssetHistoryEntry(assetId, dateVal, value, str(row(r, 4)) || undefined);
                counts['Asset History'] = (counts['Asset History'] || 0) + 1;
            } catch (e) {
                errors.push(`Asset history "${assetName}" ${dateVal}: ${(e as Error).message}`);
            }
        }

        // 9. Plans
        const plansRows = getSheetRows(workbook, 'Plans');
        const planNameToId: Record<string, number> = {};
        for (let i = 1; i < plansRows.length; i++) {
            const r = plansRows[i];
            const name = str(row(r, 1));
            if (!name) continue;
            const cover_amount = num(row(r, 2));
            const premium_amount = num(row(r, 3));
            const premium_frequency = str(row(r, 4)) || 'yearly';
            const expiry_date = str(row(r, 5)) || undefined;
            const next_premium_date = str(row(r, 6)) || undefined;
            const notes = str(row(r, 7)) || undefined;
            try {
                const created = await createPlan(name, cover_amount, premium_amount, premium_frequency, expiry_date, next_premium_date, notes);
                planNameToId[name] = created.id;
                counts['Plans'] = (counts['Plans'] || 0) + 1;
            } catch (e) {
                errors.push(`Plan "${name}": ${(e as Error).message}`);
            }
        }

        // 10. Plan History
        const planHistoryRows = getSheetRows(workbook, 'Plan History');
        for (let i = 1; i < planHistoryRows.length; i++) {
            const r = planHistoryRows[i];
            const planName = str(row(r, 1));
            const dateVal = str(row(r, 2));
            const cover_amount = num(row(r, 3));
            const premium_amount = num(row(r, 4));
            if (!planName || !dateVal) continue;
            const planId = planNameToId[planName];
            if (!planId) continue;
            try {
                await createPlanHistoryEntry(planId, dateVal, cover_amount, premium_amount, str(row(r, 5)) || undefined);
                counts['Plan History'] = (counts['Plan History'] || 0) + 1;
            } catch (e) {
                errors.push(`Plan history "${planName}" ${dateVal}: ${(e as Error).message}`);
            }
        }

        // 11. Life XP
        const lifeXpRows = getSheetRows(workbook, 'Life XP');
        const lifeXpNameToId: Record<string, number> = {};
        for (let i = 1; i < lifeXpRows.length; i++) {
            const r = lifeXpRows[i];
            const name = str(row(r, 1));
            if (!name) continue;
            const target_amount = num(row(r, 2));
            const isRepetitive = str(row(r, 4)).toLowerCase() === 'yes';
            const frequency = str(row(r, 5)) || undefined;
            const next_contribution_date = str(row(r, 6)) || undefined;
            const notes = str(row(r, 8)) || undefined;
            try {
                const created = await createLifeXpBucket(name, target_amount, isRepetitive, frequency, next_contribution_date, notes);
                lifeXpNameToId[name] = created.id;
                counts['Life XP'] = (counts['Life XP'] || 0) + 1;
            } catch (e) {
                errors.push(`Life XP "${name}": ${(e as Error).message}`);
            }
        }

        // 12. Life XP History (contributions)
        const lifeXpHistoryRows = getSheetRows(workbook, 'Life XP History');
        for (let i = 1; i < lifeXpHistoryRows.length; i++) {
            const r = lifeXpHistoryRows[i];
            const bucketName = str(row(r, 1));
            const dateVal = str(row(r, 2));
            const amount = num(row(r, 3));
            if (!bucketName || !dateVal) continue;
            const bucketId = lifeXpNameToId[bucketName];
            if (!bucketId) continue;
            try {
                await addContribution(bucketId, amount, str(row(r, 5)) || undefined);
                counts['Life XP History'] = (counts['Life XP History'] || 0) + 1;
            } catch (e) {
                errors.push(`Life XP history "${bucketName}" ${dateVal}: ${(e as Error).message}`);
            }
        }

        // 13. Fixed Returns
        const fixedRows = getSheetRows(workbook, 'Fixed Returns');
        for (let i = 1; i < fixedRows.length; i++) {
            const r = fixedRows[i];
            const name = str(row(r, 1));
            if (!name) continue;
            const invested_amount = num(row(r, 2));
            const interest_rate = num(row(r, 3));
            const start_date = str(row(r, 4));
            const maturity_date = str(row(r, 5));
            if (!start_date || !maturity_date) continue;
            try {
                await createFixedReturn(name, invested_amount, interest_rate, start_date, maturity_date, str(row(r, 10)) || undefined);
                counts['Fixed Returns'] = (counts['Fixed Returns'] || 0) + 1;
            } catch (e) {
                errors.push(`Fixed return "${name}": ${(e as Error).message}`);
            }
        }

        // 14. SIPs
        const sipsRows = getSheetRows(workbook, 'SIPs');
        const sipNameToId: Record<string, number> = {};
        for (let i = 1; i < sipsRows.length; i++) {
            const r = sipsRows[i];
            const name = str(row(r, 1));
            if (!name) continue;
            const sip_amount = num(row(r, 3));
            const start_date = str(row(r, 4));
            const current_nav = num(row(r, 6));
            if (!start_date) continue;
            try {
                const created = await createSIP(name, sip_amount, start_date, current_nav || 1, str(row(r, 12)) || undefined, num(row(r, 2)) || undefined, num(row(r, 5)), num(row(r, 7)));
                sipNameToId[name] = created.id;
                counts['SIPs'] = (counts['SIPs'] || 0) + 1;
            } catch (e) {
                errors.push(`SIP "${name}": ${(e as Error).message}`);
            }
        }

        // 15. SIP Transactions
        const sipTxRows = getSheetRows(workbook, 'SIP Transactions');
        for (let i = 1; i < sipTxRows.length; i++) {
            const r = sipTxRows[i];
            const sipName = str(row(r, 1));
            const dateVal = str(row(r, 2));
            const type = (str(row(r, 3)) || 'sip') as 'sip' | 'lumpsum';
            const amount = num(row(r, 4));
            const nav = num(row(r, 5));
            if (!sipName || !dateVal) continue;
            const sipId = sipNameToId[sipName];
            if (!sipId) continue;
            try {
                await addSIPInstallment(sipId, amount, nav || amount, dateVal, type === 'lumpsum' ? 'lumpsum' : 'sip', str(row(r, 7)) || undefined);
                counts['SIP Transactions'] = (counts['SIP Transactions'] || 0) + 1;
            } catch (e) {
                errors.push(`SIP transaction "${sipName}" ${dateVal}: ${(e as Error).message}`);
            }
        }

        // 16. Recurring Deposits
        const rdsRows = getSheetRows(workbook, 'Recurring Deposits');
        for (let i = 1; i < rdsRows.length; i++) {
            const r = rdsRows[i];
            const name = str(row(r, 1));
            if (!name) continue;
            const installment_amount = num(row(r, 2));
            const frequency = (str(row(r, 3)) || 'monthly') as 'monthly' | 'yearly' | 'custom';
            const interest_rate = num(row(r, 4));
            const start_date = str(row(r, 5));
            const total_installments = num(row(r, 6));
            if (!start_date || total_installments < 1) continue;
            try {
                await createRecurringDeposit(name, installment_amount, frequency, interest_rate, start_date, total_installments, undefined, str(row(r, 13)) || undefined);
                counts['Recurring Deposits'] = (counts['Recurring Deposits'] || 0) + 1;
            } catch (e) {
                errors.push(`RD "${name}": ${(e as Error).message}`);
            }
        }

        // 17–19. Stocks (by sheet name)
        const stocksSheets: { name: string; market: 'indian' | 'us' | 'crypto' }[] = [
            { name: 'Stocks - Indian', market: 'indian' },
            { name: 'Stocks - US', market: 'us' },
            { name: 'Stocks - Crypto', market: 'crypto' }
        ];
        for (const { name: sheetName, market } of stocksSheets) {
            const rows = getSheetRows(workbook, sheetName);
            for (let i = 1; i < rows.length; i++) {
                const r = rows[i];
                const symbol = str(row(r, 1));
                const stockName = str(row(r, 2));
                const quantity = num(row(r, 3));
                const buy_price = num(row(r, 4));
                const buy_date = str(row(r, 5));
                if (!symbol || !stockName || quantity <= 0 || !buy_date) continue;
                const invested_value = quantity * (buy_price || 0) || quantity;
                const current_price = num(row(r, 6)) || buy_price;
                try {
                    await createStock(market, symbol, stockName, quantity, invested_value, buy_date, current_price, str(row(r, 10)) || undefined);
                    counts['Stocks'] = (counts['Stocks'] || 0) + 1;
                } catch (e) {
                    errors.push(`Stock ${market} "${symbol}": ${(e as Error).message}`);
                }
            }
        }
    } catch (e) {
        errors.push(`Import failed: ${(e as Error).message}`);
    }

    return {
        success: errors.length === 0,
        year,
        counts,
        errors
    };
}
