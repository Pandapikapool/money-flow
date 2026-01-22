# Life XP Complete Guide – All Tiers

A unified framework for funding life experiences and major purchases across six tiers, from small indulgences to life-changing assets.

---

## Core Variables (All Tiers)

- **B** = Monthly Budget
- **X** = Cost of the Life XP
- **ΔB** = Monthly budget compression (amount saved from B)
- **T** = Time to fund the Life XP (in months or years)
- **V** = Monthly Investment contribution
- **v** = Monthly diversion from V (investment slowing)
- **VI** = Realized investment profits
  - **VI_last** = Profit from previous year
  - **VI_curr** = Profit from current year (only after booking)
- **Vp** = Previously invested principal (existing corpus)
- **NW** = Net Worth (Total Assets − Total Liabilities)
- **Loan** = Borrowed capital
- **Exposure** = Vp_used + Loan

---

## Tier 0 – Small Life XP

**Range:** X ≤ 1.5B  
**Time:** T ≤ 3 months  
**Funding:** Budget compression only

### Rules
- Maximum time: **T ≤ 3 months** (non-negotiable)
- Maximum size: **X ≤ 1.5B**
- Budget compression: **0.25B ≤ ΔB ≤ 0.50B** (choose in advance)
- No investments, no interest, no loans
- Formula: **T = X / ΔB**

### Special Cases
- If **X ≤ 0.5B** → Can be purchased in **1 month**
- If **ΔB < 0.25B** → Acceptable if **T ≤ 2 months**
- Finishing in less than 3 months is always acceptable

### One-Line Rule
> A Small Life XP must be fully funded within **3 months** using a pre-decided monthly budget cut between **25% and 50% of B**.

---

## Tier 1 – Medium Life XP

**Range:** 1.5B < X ≤ 3B  
**Time:** 3 ≤ T ≤ 6 months  
**Funding:** Investment profits + budget compression

### Rules
- Time window: **3 ≤ T ≤ 6 months**
- **Mandatory profit gate:** At least **0.5B MUST come from VI** (realized profits only)
- Use **VI_last first**, then **VI_curr** (only after booking)
- Remaining amount: **X − 0.5B** funded via **ΔB**
- Budget compression: **0.25B ≤ ΔB ≤ 0.50B**
- Formula: **T = (X − 0.5B) / ΔB**
- Once VI is used, it is **consumed** and cannot be counted again

### Special Cases
- If **VI ≥ X** → XP can be purchased immediately (still Tier 1)
- If **ΔB < 0.25B** → Acceptable only if **T ≤ 3 months**
- Profit gate applies **per Tier 1 XP**, not combined

### One-Line Rule
> A Tier 1 Life XP (1.5B–3B) is allowed only if at least 0.5B comes from already-realized investment profits, and the remaining amount can be funded via budget compression within 3–6 months.

---

## Tier 2 – Medium+ Life XP

**Range:** 3B < X ≤ 6B  
**Time:** 6 ≤ T ≤ 12 months  
**Funding:** Investment profits + investment diversion + budget compression

### Rules
- Time window: **6 ≤ T ≤ 12 months**
- **Mandatory profit gate:** **VI_used ≥ 1B** (realized profits only)
- **Maximum V usage:** **V_used,total ≤ 1B**
- Budget compression: **0 < ΔB ≤ 0.5B**
- Investment diversion: **0 < v ≤ 0.5V** (investments slowed, never stopped)
- **V_continue = V − v > 0** must always hold
- Formula: **X = VI_used + (v × T) + (ΔB × T)**
- Time check: **T = (X − VI_used − V_used,total) / ΔB**

### Priority Order
1. Use **VI_last**
2. Then **VI_curr** (only realized)
3. Then divert monthly **v**
4. Then apply **ΔB over time**

### One-Line Rule
> A Tier-2 Life XP (3B–6B) is allowed only if at least 1B comes from realized investment profits, investments are slowed but not stopped (v ≤ 0.5V), budget compression stays within limits (ΔB ≤ 0.5B), and the XP completes within 6–12 months.

---

## Tier 3 – Large Life XP

**Range:** 6B < X ≤ 12B  
**Time:** 12 ≤ T ≤ 24 months  
**Funding:** Investment profits + investment diversion + budget compression

### Hard Constraints
- ❌ No loans / EMIs
- ❌ No leverage
- ❌ No emergency fund usage
- ❌ No speculative future profits
- ❌ Max 2 Tier-3 XPs at a time

### Rules
- **Mandatory profit gate:** **VI_used ≥ max(1B, 0.25 × X)**
  - Minimum VI range: **1.5B → 3B**
  - For X = 12B → VI_used ≥ 3B
- Budget compression: **0 < ΔB ≤ 0.5B** (recommended: **0.30B–0.40B**)
- Investment diversion: **0 < v ≤ 0.5V** (recommended: **0.25V–0.40V**)
- **V_continue = V − v > 0** must always hold
- Formula: **X = VI_used + (ΔB × T) + (v × T)**
- Time check: **T = (X − VI_used) / (ΔB + v)**

### Sub-Types

**Tier 3A – Balanced Large XP (Recommended)**
- X: 6B–9B
- VI_used: ~25%–30% of X
- ΔB: 0.30B–0.40B
- v: 0.25V–0.35V
- T: 12–18 months

**Tier 3B – Heavy Large XP (Caution)**
- X: 9B–12B
- VI_used: ~30%–40% of X
- ΔB: 0.40B–0.50B
- v: 0.35V–0.50V
- T: 18–24 months
- Max **one Tier 3B at a time**

### One-Line Rule
> A Tier-3 Life XP (6B–12B) is allowed only if at least 25% of its cost comes from realized profits, the remainder is funded via controlled budget compression and investment slowing, it completes within 12–24 months, and it uses zero debt.

---

## Tier 4 – Life Architecture

**Range:** 12B < X ≤ 24B  
**Time:** 1 ≤ T ≤ 3 years  
**Funding:** Investment profits + principal + investment diversion + budget compression + optional loan

### Hard Constraints
- All calculations done **year-wise**, not month-wise
- Loans are **optional**, not required

### Rules
- **Mandatory profit gate:** **VI_used ≥ 0.25 × X**
  - X = 12B → VI ≥ 3B
  - X = 24B → VI ≥ 6B
- **Principal usage (Vp):**
  - Eligibility: Total corpus ≥ 24B AND post-withdrawal corpus ≥ 18B
  - Limit: **Vp_used ≤ 0.25 × X**
- Investment diversion: **v ≤ 0.75V** (only during Tier-4)
- Budget compression: **ΔB ≤ 0.30B** (recommended)
- Loan (optional): **Loan ≤ 0.20 × X** (for smoothing only)
- Formula: **X = VI_used + Vp_used + (v × 12 × T) + (ΔB × 12 × T) + Loan**

### Sub-Types

**Tier 4A – Capital-Strong (Recommended)**
- X: 12B–18B
- VI_used: ~25–30%
- Vp_used: ~15–25%
- v: 0.4V–0.6V
- ΔB: 0.2B–0.3B
- Loan: 0

**Tier 4B – Capital-Heavy (Caution)**
- X: 18B–24B
- VI_used: ~25%
- Vp_used: full 25%
- v: 0.6V–0.75V
- ΔB: ~0.3B
- Loan: 0–0.2X (optional)

### One-Line Rule
> Tier-4 Life Architecture (12B–24B) is allowed only if at least 25% comes from realized profits, up to 25% from an existing investment corpus that never drops below 18B, monthly investments may be slowed up to 75%, budget compression is moderate, loans are optional and capped at 20%, and the decision completes within 1–3 years.

---

## Tier 5 – Assets & Balance Sheet Decisions

**Range:** X > 24B  
**Time:** Variable (asset-based)  
**Funding:** Investment profits + principal + optional loan  
**Evaluation:** Based on Net Worth (NW), not monthly budget

### Hard Constraints
- ❌ Exposure must NEVER exceed **50% of NW**
- ❌ Net worth after decision must remain **positive**
- ❌ No speculative assumptions (resale, appreciation)
- ❌ Loans allowed ONLY inside defined caps
- ❌ Tier-5 rules override all lower-tier rules

### Entry Conditions
- **Minimum corpus:** **Vp_total ≥ 12B** (below this, Tier 5 not allowed)
- **Principal usage:** **Vp_used ≤ 0.50 × X** AND **Post-use corpus ≥ 12B**
- **Mandatory profit gate:** **VI_used ≥ 0.25 × X**
- **Loan cap:** **Loan ≤ 0.25 × X** (only after VI + Vp applied)
- **Exposure check:** **Exposure = Vp_used + Loan** AND **Exposure / NW ≤ 0.50**

### Formula
**X = VI_used + Vp_used + Loan**

Where:
- VI_used ≥ 0.25X
- Vp_used ≤ 0.50X (corpus ≥ 12B after use)
- Loan ≤ 0.25X
- Exposure ≤ 0.50NW

### Sub-Classes

**Tier 5A – Primary Residence**
- VI_used: ≥ 25% X
- Vp_used: ≤ 50% X
- Loan: ≤ 25% X
- Exposure: ≤ 50% NW
- Use case: Self-occupied home

**Tier 5B – Wealth / Income Assets**
- VI_used: ≥ 25% X
- Vp_used: ≤ 40% X
- Loan: ≤ 20% X
- Exposure: ≤ 40% NW
- Use case: Rental, CRE, equity

**Tier 5C – High-Risk Bets**
- VI_used: ≥ 25% X
- Vp_used: ≤ 20% X
- Loan: ≤ 10% X
- Exposure: ≤ 20% NW
- Use case: Startup, speculation

### One-Line Rule
> Tier-5 decisions are allowed only when at least 75% of the asset is self-funded (profits + existing corpus), exposure stays below 50% of net worth, and invested capital never drops below a survivable floor (12B).

---

## Quick Reference Table

| Tier | Range | Time | VI Required | Vp Allowed | Loan | Key Constraint |
|------|-------|------|-------------|------------|------|----------------|
| **0** | ≤ 1.5B | ≤ 3 months | 0 | 0 | ❌ | Budget only |
| **1** | 1.5B–3B | 3–6 months | ≥ 0.5B | 0 | ❌ | Profit gate |
| **2** | 3B–6B | 6–12 months | ≥ 1B | 0 | ❌ | v ≤ 0.5V |
| **3** | 6B–12B | 12–24 months | ≥ 25% X | 0 | ❌ | Max 2 at once |
| **4** | 12B–24B | 1–3 years | ≥ 25% X | ≤ 25% X | ≤ 20% X | Corpus ≥ 18B |
| **5** | > 24B | Variable | ≥ 25% X | ≤ 50% X | ≤ 25% X | Exposure ≤ 50% NW |

---

## Universal Principles

1. **Profit Gate:** All tiers (1–5) require realized investment profits. Unrealized gains don't count.
2. **Profit Consumption:** Once VI is used, it is consumed and cannot be reused.
3. **Investment Continuity:** Investments are slowed (v), never stopped (V_continue > 0).
4. **Budget Discipline:** ΔB is always capped at 0.5B (except Tier 4, where 0.3B is recommended).
5. **No Debt Dependency:** Loans are optional (Tier 4) or tightly capped (Tier 5), never required.
6. **Time Discipline:** Each tier has strict time windows to prevent drift and fatigue.

---

## Decision Flow

1. **Identify X** (cost of Life XP)
2. **Determine tier** based on X range
3. **Check entry conditions** (profit gate, corpus, etc.)
4. **Calculate funding mix** (VI, Vp, v, ΔB, Loan)
5. **Verify time constraint** (T within tier limits)
6. **Execute with discipline** (no mid-way rule changes)

---

*This guide consolidates all Life XP tiers into a single, non-repetitive framework for disciplined life experience funding.*
