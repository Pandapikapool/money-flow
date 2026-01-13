import { Router } from "express";
import * as controller from "./resources.controller";

const router = Router();

// Accounts
router.get("/accounts", controller.listAccounts);
router.post("/accounts", controller.createAccount);
router.put("/accounts/:id", controller.updateAccount);
router.delete("/accounts/:id", controller.deleteAccount);
router.get("/accounts/:id/history", controller.getAccountHistory);
router.post("/accounts/:id/history", controller.createHistoryEntry);
router.put("/history/:id", controller.updateHistoryEntry);
router.delete("/history/:id", controller.deleteHistoryEntry);

// Assets
router.get("/assets", controller.listAssets);
router.post("/assets", controller.createAsset);
router.put("/assets/:id", controller.updateAsset);
router.delete("/assets/:id", controller.deleteAsset);
router.get("/assets/:id/history", controller.getAssetHistory);
router.post("/assets/:id/history", controller.createAssetHistoryEntry);
router.put("/asset-history/:id", controller.updateAssetHistoryEntry);
router.delete("/asset-history/:id", controller.deleteAssetHistoryEntry);

// Plans
router.get("/plans", controller.listPlans);
router.post("/plans", controller.createPlan);
router.put("/plans/:id", controller.updatePlan);
router.delete("/plans/:id", controller.deletePlan);
router.get("/plans/:id/history", controller.getPlanHistory);
router.post("/plans/:id/history", controller.createPlanHistoryEntry);
router.put("/plan-history/:id", controller.updatePlanHistoryEntry);
router.delete("/plan-history/:id", controller.deletePlanHistoryEntry);

// Life XP Buckets
router.get("/life-xp", controller.listLifeXpBuckets);
router.post("/life-xp", controller.createLifeXpBucket);
router.put("/life-xp/:id", controller.updateLifeXpBucket);
router.delete("/life-xp/:id", controller.deleteLifeXpBucket);
router.post("/life-xp/:id/contribute", controller.addContribution);
router.post("/life-xp/:id/achieved", controller.markBucketAchieved);
router.post("/life-xp/:id/reactivate", controller.reactivateBucket);
router.post("/life-xp/:id/mark-done", controller.markContributionDone);
router.get("/life-xp/:id/history", controller.getLifeXpHistory);
router.put("/life-xp-history/:id", controller.updateLifeXpHistoryEntry);
router.delete("/life-xp-history/:id", controller.deleteLifeXpHistoryEntry);

// Fixed Returns
router.get("/fixed-returns", controller.listFixedReturns);
router.get("/fixed-returns/summary", controller.getFixedReturnsSummary);
router.post("/fixed-returns", controller.createFixedReturn);
router.put("/fixed-returns/:id", controller.updateFixedReturn);
router.post("/fixed-returns/:id/close", controller.closeFixedReturn);
router.put("/fixed-returns/:id/closed", controller.updateClosedFixedReturn);
router.delete("/fixed-returns/:id", controller.deleteFixedReturn);

// SIP / Mutual Funds
router.get("/sips", controller.listSIPs);
router.get("/sips/summary", controller.getSIPSummary);
router.post("/sips", controller.createSIP);
router.put("/sips/:id", controller.updateSIP);
router.put("/sips/:id/nav", controller.updateSIPNav);
router.post("/sips/:id/installment", controller.addSIPInstallment);
router.post("/sips/:id/pause", controller.pauseSIP);
router.post("/sips/:id/resume", controller.resumeSIP);
router.post("/sips/:id/redeem", controller.redeemSIP);
router.delete("/sips/:id", controller.deleteSIP);
router.get("/sips/:id/transactions", controller.getSIPTransactions);

// Recurring Deposits
router.get("/recurring-deposits", controller.listRecurringDeposits);
router.get("/recurring-deposits/summary", controller.getRDSummary);
router.post("/recurring-deposits", controller.createRecurringDeposit);
router.put("/recurring-deposits/:id", controller.updateRecurringDeposit);
router.post("/recurring-deposits/:id/mark-paid", controller.markRDInstallmentPaid);
router.post("/recurring-deposits/:id/close", controller.closeRecurringDeposit);
router.delete("/recurring-deposits/:id", controller.deleteRecurringDeposit);

// Stocks & Crypto (market = 'indian', 'us', or 'crypto')
router.get("/stocks/:market", controller.listStocks);
router.get("/stocks/:market/summary", controller.getStocksSummary);
router.post("/stocks/:market", controller.createStock);
router.put("/stocks/item/:id", controller.updateStock);
router.put("/stocks/item/:id/price", controller.updateStockPrice);
router.post("/stocks/item/:id/sell", controller.sellStock);
router.delete("/stocks/item/:id", controller.deleteStock);

export default router;
