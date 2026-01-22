=====================================================
LIFE XP DECISION TREE (TIER 0 → TIER 3)
=====================================================

NOTE (HARD CONSTRAINTS — APPLY EVERYWHERE)
------------------------------------------
- NO loans / EMIs / leverage (any tier)
- NO emergency fund usage
- Investment principal is sacred (existing V is not touched directly)
- Monthly budget compression ΔB ≤ 0.5B (GLOBAL CAP)
- Monthly investment diversion v ≤ 0.5V (GLOBAL CAP)
- ΔB and v must be decided BEFORE starting an XP
- Once VI (profit) is used, it is CONSUMED (no double counting)
- Unrealized gains do NOT count as VI
- Rules cannot be relaxed mid-way
- If unsure → wait (waiting is always valid)

=====================================================
STEP 1: DEFINE THE LIFE XP
=====================================================

Input:
- X = total cost of Life XP (in terms of B)
- B = monthly budget
- V = monthly investment
- VI = realized investment profits available

-----------------------------------------------------
STEP 2: CLASSIFY BY SIZE (FIRST FILTER)
-----------------------------------------------------

IF X ≤ 1.5B
    → Go to TIER 0 (Small Life XP)

ELSE IF 1.5B < X ≤ 3B
    → Go to TIER 1 (Medium Life XP)

ELSE IF 3B < X ≤ 6B
    → Go to TIER 2 (Medium+ Life XP)

ELSE IF 6B < X ≤ 12B
    → Go to TIER 3 (Large Life XP)

ELSE
    → NOT A LIFE XP
    → This is life planning / net-worth decision
    → STOP

=====================================================
TIER 0: SMALL LIFE XP (X ≤ 1.5B)
=====================================================

Purpose:
- Quick upgrades
- Short-lived desires
- No emotional attachment

Rules:
- Funding ONLY via budget compression (ΔB)
- No investment profits (VI) needed
- No investment diversion (v)

Choose:
- ΔB such that 0.25B ≤ ΔB ≤ 0.5B

Calculate:
- T = X / ΔB

IF T ≤ 3 months
    → APPROVED
ELSE
    → Reject or reclassify to Tier 1

Comments:
- Multiple Tier 0 XPs allowed IF total ΔB ≤ 0.5B
- If X ≤ 0.5B → can be done in 1 month

=====================================================
TIER 1: MEDIUM LIFE XP (1.5B < X ≤ 3B)
=====================================================

Purpose:
- Persistent wants (bike, major gadget, long travel)
- First emotional pressure zone

MANDATORY PROFIT GATE:
- VI_used ≥ 0.5B

IF VI_available < 0.5B
    → WAIT (cannot start)

Remaining:
- R = X − 0.5B

Choose:
- ΔB such that 0.25B ≤ ΔB ≤ 0.5B

Calculate:
- T = R / ΔB

IF 3 ≤ T ≤ 6 months
    → APPROVED
ELSE
    → Reject or wait

Comments:
- Tier 1 requires VI even if math looks like Tier 0
- Only 1 Tier 1 XP at a time is recommended
- Tier 0 XPs should NOT be chained to bypass VI gate

=====================================================
TIER 2: MEDIUM+ LIFE XP (3B < X ≤ 6B)
=====================================================

Purpose:
- Identity-linked upgrades
- High temptation for EMIs

MANDATORY PROFIT GATE:
- VI_used ≥ 1B

IF VI_available < 1B
    → WAIT

Choose:
- ΔB ≤ 0.5B
- v ≤ 0.5V

Total monthly funding:
- M = ΔB + v

Calculate:
- T = (X − 1B) / M

IF 6 ≤ T ≤ 12 months
    → APPROVED
ELSE
    → Reject or wait

Comments:
- Investments must continue (V − v > 0)
- Only ONE Tier 2 XP at a time
- Profit gate applies PER XP, not pooled

=====================================================
TIER 3: LARGE LIFE XP (6B < X ≤ 12B)
=====================================================

Purpose:
- Life-structure changes (car, relocation, major milestones)
- Highest regret risk

MANDATORY PROFIT GATE:
- VI_used ≥ max(1B, 0.25 × X)

IF VI_available < required VI_used
    → WAIT (DO NOT START)

Choose:
- ΔB ≤ 0.5B
- v ≤ 0.5V

Total monthly funding:
- M = ΔB + v

Calculate:
- T = (X − VI_used) / M

IF 12 ≤ T ≤ 24 months
    → APPROVED
ELSE
    → Reject (not ready)

Comments:
- Max 2 Tier 3 XPs TOTAL (including overlap)
- Tier 3B (X > 9B) → only ONE at a time
- Tier 3 should feel slow and heavy — that is intentional

=====================================================
GLOBAL EXIT CONDITIONS
=====================================================

At ANY point:
- If rules feel uncomfortable → WAIT
- If tempted to borrow → STOP
- If timeline drifts beyond limits → FREEZE XP
- If income or life stability drops → PAUSE ALL NON-TIER-0 XPs

=====================================================
END OF DECISION TREE
=====================================================
