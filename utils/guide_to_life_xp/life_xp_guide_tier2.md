Tier-2 — Final Correct Formula (Locked, To the Point)
# Tier 2 – Medium+ Life XP (Final Locked Rules)

This document defines **how Tier 2 Life XP (3B–6B)** is funded using  
**investment profits (VI)**, **controlled monthly investment diversion (v)**,  
and **budget compression (ΔB)** — without breaking long-term discipline.

---

## 1. Variables

- **B** = Monthly Budget  
- **V** = Monthly Investment contribution  
- **X** = Cost of the Life XP  
- **ΔB** = Monthly budget compression (taken from B)  
- **v** = Monthly diversion from V (investment slowing, not stopping)  
- **T** = Time to fund XP (months)  

### Investment Profits
- **VI** = Realized investment profits  
  - **VI_last** = Previous year realized profits  
  - **VI_curr** = Current year realized profits (only after booking)

---

## 2. Tier Definition (Fixed)

3B < X ≤ 6B



Examples:
- Premium bike
- Large international travel
- Major lifestyle identity upgrade

---

## 3. Fixed Constants (Non-Negotiable)

Time window: 6 ≤ T ≤ 12 months
Minimum profit: VI_used ≥ 1B
Maximum V usage: V_used,total ≤ 1B



Rules:
- VI must be **realized**
- Use **VI_last first**, then VI_curr
- Once used, VI is **consumed**
- Unrealized gains do NOT count

If `VI_used < 1B` → ❌ Tier 2 XP not allowed

---

## 4. Monthly Limits (Hard Caps)

### Budget Compression
0 < ΔB ≤ 0.5B


### Investment Diversion
0 < v ≤ 0.5V



Rules:
- Investments are **slowed, never stopped**
- `V_continue = V − v > 0` must always hold

---

## 5. Funding Structure (Core Equation)

X = VI_used + (v × T) + (ΔB × T)



Where:
- `VI_used ≥ 1B`
- `v × T ≤ 1B`
- Remaining amount is covered via ΔB

---

## 6. Time Calculation (Mandatory Check)

T = (X − VI_used − V_used,total) / ΔB


Acceptance:
6 ≤ T ≤ 12



If `T > 12` even at `ΔB = 0.5B` → ❌ reject or postpone Tier 2 XP

---

## 7. Priority Order of Funding

1. Use **VI_last**
2. Then **VI_curr** (only realized)
3. Then divert monthly **v**
4. Then apply **ΔB over time**

This order is **mandatory**.

---

## 8. Failure Modes & Protections

### Failure Mode 1 — Stopping Investments
- Protection: `v ≤ 0.5V` and `V_continue > 0`

### Failure Mode 2 — Profit Illusion
- Protection: Profit gate applies **per XP**
- Only **one Tier-2 XP at a time**

### Failure Mode 3 — Timeline Drift
- Protection: Hard stop at `T = 12`

### Failure Mode 4 — Identity Lock-In
- Protection: Mandatory VI gate, optional V use

---

## 9. Fixed vs Flexible Summary

### Fixed
- XP range: 3B–6B
- Time: 6–12 months
- Min profit: 1B
- No loans
- No principal liquidation

### Flexible
- ΔB (up to 0.5B)
- v (up to 0.5V)
- Mix between ΔB and v
- Whether V is used at all

---

## 10. One-Line Rule (Final)

> **A Tier-2 Life XP (3B–6B) is allowed only if at least 1B comes from realized investment profits, investments are slowed but not stopped (v ≤ 0.5V), budget compression stays within limits (ΔB ≤ 0.5B), and the XP completes within 6–12 months.**

---

Fixed constants
XP range:        3B < X ≤ 6B
Time window:     6 ≤ T ≤ 12 months
Min profit gate: VI_used ≥ 1B
Max V usage:     V_used,total ≤ 1B

Monthly variables
ΔB ≤ 0.5B
v  ≤ 0.5V

Funding equation (core)
X = VI_used + (v × T) + (ΔB × T)


Where:

VI_used ≥ 1B

v × T ≤ 1B

ΔB × T = remaining amount

Time calculation (must satisfy)
T = (X − VI_used − V_used,total) / ΔB


Acceptance conditions:

6 ≤ T ≤ 12


If T > 12 even at ΔB = 0.5B → ❌ reject Tier-2