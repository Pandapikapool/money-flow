import { useState, useEffect } from "react";

interface LifeXpGuideProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LifeXpGuide({ isOpen, onClose }: LifeXpGuideProps) {
    // Handle ESC key to close
    useEffect(() => {
        if (!isOpen) return;
        
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Prevent body scroll when guide is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 1000,
                    animation: 'fadeIn 0.2s ease-in'
                }}
                onClick={onClose}
            />
            
            {/* Sidebar */}
            <div
                className="guide-sidebar"
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    width: '600px',
                    maxWidth: '90vw',
                    height: '100vh',
                    background: 'var(--bg-app)',
                    boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.2)',
                    zIndex: 1001,
                    overflowY: 'auto',
                    animation: 'slideInRight 0.3s ease-out',
                    borderLeft: '1px solid var(--border-color)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    position: 'sticky',
                    top: 0,
                    background: 'var(--bg-app)',
                    backdropFilter: 'blur(10px)',
                    borderBottom: '1px solid var(--border-color)',
                    padding: '20px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    zIndex: 10
                }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                        Life XP Guide
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--bg-panel)';
                            e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '24px' }}>
                    <GuideContent />
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                /* Custom scrollbar for guide sidebar */
                .guide-sidebar::-webkit-scrollbar {
                    width: 8px;
                }
                .guide-sidebar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .guide-sidebar::-webkit-scrollbar-thumb {
                    background: var(--border-color);
                    border-radius: 4px;
                }
                .guide-sidebar::-webkit-scrollbar-thumb:hover {
                    background: var(--text-secondary);
                }
            `}</style>
        </>
    );
}

function GuideContent() {
    return (
        <div style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            lineHeight: '1.7',
            color: 'var(--text-primary)'
        }}>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '12px', color: 'var(--accent-primary)' }}>
                    Life XP Complete Guide
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    A unified framework for funding life experiences and major purchases across six tiers, from small indulgences to life-changing assets.
                </p>
            </div>

            {/* Core Variables */}
            <Section title="Core Variables (All Tiers)">
                <ul style={{ margin: '12px 0', paddingLeft: '24px', color: 'var(--text-secondary)' }}>
                    <li><strong style={{ color: 'var(--text-primary)' }}>B</strong> = Monthly Budget</li>
                    <li><strong style={{ color: 'var(--text-primary)' }}>X</strong> = Cost of the Life XP</li>
                    <li><strong style={{ color: 'var(--text-primary)' }}>ΔB</strong> = Monthly budget compression (amount saved from B)</li>
                    <li><strong style={{ color: 'var(--text-primary)' }}>T</strong> = Time to fund the Life XP (in months or years)</li>
                    <li><strong style={{ color: 'var(--text-primary)' }}>V</strong> = Monthly Investment contribution</li>
                    <li><strong style={{ color: 'var(--text-primary)' }}>v</strong> = Monthly diversion from V (investment slowing)</li>
                    <li><strong style={{ color: 'var(--text-primary)' }}>VI</strong> = Realized investment profits</li>
                    <li><strong style={{ color: 'var(--text-primary)' }}>Vp</strong> = Previously invested principal (existing corpus)</li>
                    <li><strong style={{ color: 'var(--text-primary)' }}>NW</strong> = Net Worth (Total Assets − Total Liabilities)</li>
                    <li><strong style={{ color: 'var(--text-primary)' }}>Loan</strong> = Borrowed capital</li>
                </ul>
            </Section>

            {/* Tier 0 */}
            <TierSection
                tier={0}
                title="Small Life XP"
                range="X ≤ 1.5B"
                time="T ≤ 3 months"
                funding="Budget compression only"
            >
                <RuleItem label="Maximum time" value="T ≤ 3 months (non-negotiable)" />
                <RuleItem label="Maximum size" value="X ≤ 1.5B" />
                <RuleItem label="Budget compression" value="0.25B ≤ ΔB ≤ 0.50B (choose in advance)" />
                <RuleItem label="Restrictions" value="No investments, no interest, no loans" />
                <RuleItem label="Formula" value="T = X / ΔB" />
                <p style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-panel)', borderRadius: '6px', borderLeft: '3px solid var(--accent-primary)' }}>
                    <strong>One-Line Rule:</strong> A Small Life XP must be fully funded within <strong>3 months</strong> using a pre-decided monthly budget cut between <strong>25% and 50% of B</strong>.
                </p>
            </TierSection>

            {/* Tier 1 */}
            <TierSection
                tier={1}
                title="Medium Life XP"
                range="1.5B < X ≤ 3B"
                time="3 ≤ T ≤ 6 months"
                funding="Investment profits + budget compression"
            >
                <RuleItem label="Time window" value="3 ≤ T ≤ 6 months" />
                <RuleItem label="Mandatory profit gate" value="At least 0.5B MUST come from VI (realized profits only)" />
                <RuleItem label="Priority" value="Use VI_last first, then VI_curr (only after booking)" />
                <RuleItem label="Remaining amount" value="X − 0.5B funded via ΔB" />
                <RuleItem label="Budget compression" value="0.25B ≤ ΔB ≤ 0.50B" />
                <RuleItem label="Formula" value="T = (X − 0.5B) / ΔB" />
                <RuleItem label="Important" value="Once VI is used, it is consumed and cannot be counted again" />
                <p style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-panel)', borderRadius: '6px', borderLeft: '3px solid var(--accent-primary)' }}>
                    <strong>One-Line Rule:</strong> A Tier 1 Life XP (1.5B–3B) is allowed only if at least 0.5B comes from already-realized investment profits, and the remaining amount can be funded via budget compression within 3–6 months.
                </p>
            </TierSection>

            {/* Tier 2 */}
            <TierSection
                tier={2}
                title="Medium+ Life XP"
                range="3B < X ≤ 6B"
                time="6 ≤ T ≤ 12 months"
                funding="Investment profits + investment diversion + budget compression"
            >
                <RuleItem label="Time window" value="6 ≤ T ≤ 12 months" />
                <RuleItem label="Mandatory profit gate" value="VI_used ≥ 1B (realized profits only)" />
                <RuleItem label="Maximum V usage" value="V_used,total ≤ 1B" />
                <RuleItem label="Budget compression" value="0 < ΔB ≤ 0.5B" />
                <RuleItem label="Investment diversion" value="0 < v ≤ 0.5V (investments slowed, never stopped)" />
                <RuleItem label="Investment continuity" value="V_continue = V − v &gt; 0 must always hold" />
                <RuleItem label="Formula" value="X = VI_used + (v × T) + (ΔB × T)" />
                <RuleItem label="Time check" value="T = (X − VI_used − V_used,total) / ΔB" />
                <p style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-panel)', borderRadius: '6px', borderLeft: '3px solid var(--accent-primary)' }}>
                    <strong>One-Line Rule:</strong> A Tier-2 Life XP (3B–6B) is allowed only if at least 1B comes from realized investment profits, investments are slowed but not stopped (v ≤ 0.5V), budget compression stays within limits (ΔB ≤ 0.5B), and the XP completes within 6–12 months.
                </p>
            </TierSection>

            {/* Tier 3 */}
            <TierSection
                tier={3}
                title="Large Life XP"
                range="6B < X ≤ 12B"
                time="12 ≤ T ≤ 24 months"
                funding="Investment profits + investment diversion + budget compression"
            >
                <div style={{ marginBottom: '12px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', borderLeft: '3px solid var(--accent-danger)' }}>
                    <strong style={{ color: 'var(--accent-danger)' }}>Hard Constraints:</strong>
                    <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', color: 'var(--text-secondary)' }}>
                        <li>❌ No loans / EMIs</li>
                        <li>❌ No leverage</li>
                        <li>❌ No emergency fund usage</li>
                        <li>❌ No speculative future profits</li>
                        <li>❌ Max 2 Tier-3 XPs at a time</li>
                    </ul>
                </div>
                <RuleItem label="Mandatory profit gate" value="VI_used ≥ max(1B, 0.25 × X)" />
                <RuleItem label="Budget compression" value="0 < ΔB ≤ 0.5B (recommended: 0.30B–0.40B)" />
                <RuleItem label="Investment diversion" value="0 < v ≤ 0.5V (recommended: 0.25V–0.40V)" />
                <RuleItem label="Formula" value="X = VI_used + (ΔB × T) + (v × T)" />
                <RuleItem label="Time check" value="T = (X − VI_used) / (ΔB + v)" />
                <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-panel)', borderRadius: '6px' }}>
                    <strong>Sub-Types:</strong>
                    <div style={{ marginTop: '8px' }}>
                        <div style={{ marginBottom: '8px' }}>
                            <strong style={{ color: 'var(--accent-success)' }}>Tier 3A – Balanced (Recommended):</strong> X: 6B–9B, T: 12–18 months
                        </div>
                        <div>
                            <strong style={{ color: 'var(--accent-warning)' }}>Tier 3B – Heavy (Caution):</strong> X: 9B–12B, T: 18–24 months, Max one at a time
                        </div>
                    </div>
                </div>
                <p style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-panel)', borderRadius: '6px', borderLeft: '3px solid var(--accent-primary)' }}>
                    <strong>One-Line Rule:</strong> A Tier-3 Life XP (6B–12B) is allowed only if at least 25% of its cost comes from realized profits, the remainder is funded via controlled budget compression and investment slowing, it completes within 12–24 months, and it uses zero debt.
                </p>
            </TierSection>

            {/* Tier 4 */}
            <TierSection
                tier={4}
                title="Life Architecture"
                range="12B < X ≤ 24B"
                time="1 ≤ T ≤ 3 years"
                funding="Investment profits + principal + investment diversion + budget compression + optional loan"
            >
                <div style={{ marginBottom: '12px', padding: '12px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '6px', borderLeft: '3px solid var(--accent-primary)' }}>
                    <strong>Note:</strong> All calculations done <strong>year-wise</strong>, not month-wise. Loans are <strong>optional</strong>, not required.
                </div>
                <RuleItem label="Mandatory profit gate" value="VI_used ≥ 0.25 × X" />
                <RuleItem label="Principal usage (Vp)" value="Vp_used ≤ 0.25 × X (corpus ≥ 24B before, ≥ 18B after)" />
                <RuleItem label="Investment diversion" value="v ≤ 0.75V (only during Tier-4)" />
                <RuleItem label="Budget compression" value="ΔB ≤ 0.30B (recommended)" />
                <RuleItem label="Loan (optional)" value="Loan ≤ 0.20 × X (for smoothing only)" />
                <RuleItem label="Formula" value="X = VI_used + Vp_used + (v × 12 × T) + (ΔB × 12 × T) + Loan" />
                <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-panel)', borderRadius: '6px' }}>
                    <strong>Sub-Types:</strong>
                    <div style={{ marginTop: '8px' }}>
                        <div style={{ marginBottom: '8px' }}>
                            <strong style={{ color: 'var(--accent-success)' }}>Tier 4A – Capital-Strong (Recommended):</strong> X: 12B–18B, Loan: 0
                        </div>
                        <div>
                            <strong style={{ color: 'var(--accent-warning)' }}>Tier 4B – Capital-Heavy (Caution):</strong> X: 18B–24B, Loan: 0–0.2X (optional)
                        </div>
                    </div>
                </div>
                <p style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-panel)', borderRadius: '6px', borderLeft: '3px solid var(--accent-primary)' }}>
                    <strong>One-Line Rule:</strong> Tier-4 Life Architecture (12B–24B) is allowed only if at least 25% comes from realized profits, up to 25% from an existing investment corpus that never drops below 18B, monthly investments may be slowed up to 75%, budget compression is moderate, loans are optional and capped at 20%, and the decision completes within 1–3 years.
                </p>
            </TierSection>

            {/* Tier 5 */}
            <TierSection
                tier={5}
                title="Assets & Balance Sheet Decisions"
                range="X &gt; 24B"
                time="Variable (asset-based)"
                funding="Investment profits + principal + optional loan"
                note="Evaluation: Based on Net Worth (NW), not monthly budget"
            >
                <div style={{ marginBottom: '12px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', borderLeft: '3px solid var(--accent-danger)' }}>
                    <strong style={{ color: 'var(--accent-danger)' }}>Hard Constraints:</strong>
                    <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', color: 'var(--text-secondary)' }}>
                        <li>❌ Exposure must NEVER exceed 50% of NW</li>
                        <li>❌ Net worth after decision must remain positive</li>
                        <li>❌ No speculative assumptions (resale, appreciation)</li>
                        <li>❌ Loans allowed ONLY inside defined caps</li>
                        <li>❌ Tier-5 rules override all lower-tier rules</li>
                    </ul>
                </div>
                <RuleItem label="Minimum corpus" value="Vp_total ≥ 12B (below this, Tier 5 not allowed)" />
                <RuleItem label="Principal usage" value="Vp_used ≤ 0.50 × X AND Post-use corpus ≥ 12B" />
                <RuleItem label="Mandatory profit gate" value="VI_used ≥ 0.25 × X" />
                <RuleItem label="Loan cap" value="Loan ≤ 0.25 × X (only after VI + Vp applied)" />
                <RuleItem label="Exposure check" value="Exposure = Vp_used + Loan AND Exposure / NW ≤ 0.50" />
                <RuleItem label="Formula" value="X = VI_used + Vp_used + Loan" />
                <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-panel)', borderRadius: '6px' }}>
                    <strong>Sub-Classes:</strong>
                    <div style={{ marginTop: '8px' }}>
                        <div style={{ marginBottom: '8px' }}>
                            <strong style={{ color: 'var(--accent-success)' }}>Tier 5A – Primary Residence:</strong> Exposure ≤ 50% NW
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                            <strong style={{ color: 'var(--accent-warning)' }}>Tier 5B – Wealth/Income Assets:</strong> Exposure ≤ 40% NW
                        </div>
                        <div>
                            <strong style={{ color: 'var(--accent-danger)' }}>Tier 5C – High-Risk Bets:</strong> Exposure ≤ 20% NW
                        </div>
                    </div>
                </div>
                <p style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-panel)', borderRadius: '6px', borderLeft: '3px solid var(--accent-primary)' }}>
                    <strong>One-Line Rule:</strong> Tier-5 decisions are allowed only when at least 75% of the asset is self-funded (profits + existing corpus), exposure stays below 50% of net worth, and invested capital never drops below a survivable floor (12B).
                </p>
            </TierSection>

            {/* Quick Reference Table */}
            <Section title="Quick Reference Table">
                <div style={{ overflowX: 'auto', marginTop: '12px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-panel)', borderBottom: '2px solid var(--border-color)' }}>
                                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600' }}>Tier</th>
                                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600' }}>Range</th>
                                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600' }}>Time</th>
                                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600' }}>VI Required</th>
                                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600' }}>Vp Allowed</th>
                                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600' }}>Loan</th>
                                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600' }}>Key Constraint</th>
                            </tr>
                        </thead>
                        <tbody>
                            <TableRow tier="0" range="≤ 1.5B" time="≤ 3 months" vi="0" vp="0" loan="❌" constraint="Budget only" />
                            <TableRow tier="1" range="1.5B–3B" time="3–6 months" vi="≥ 0.5B" vp="0" loan="❌" constraint="Profit gate" />
                            <TableRow tier="2" range="3B–6B" time="6–12 months" vi="≥ 1B" vp="0" loan="❌" constraint="v ≤ 0.5V" />
                            <TableRow tier="3" range="6B–12B" time="12–24 months" vi="≥ 25% X" vp="0" loan="❌" constraint="Max 2 at once" />
                            <TableRow tier="4" range="12B–24B" time="1–3 years" vi="≥ 25% X" vp="≤ 25% X" loan="≤ 20% X" constraint="Corpus ≥ 18B" />
                            <TableRow tier="5" range="&gt; 24B" time="Variable" vi="≥ 25% X" vp="≤ 50% X" loan="≤ 25% X" constraint="Exposure ≤ 50% NW" />
                        </tbody>
                    </table>
                </div>
            </Section>

            {/* Universal Principles */}
            <Section title="Universal Principles">
                <ol style={{ margin: '12px 0', paddingLeft: '24px', color: 'var(--text-secondary)' }}>
                    <li><strong style={{ color: 'var(--text-primary)' }}>Profit Gate:</strong> All tiers (1–5) require realized investment profits. Unrealized gains don't count.</li>
                    <li><strong style={{ color: 'var(--text-primary)' }}>Profit Consumption:</strong> Once VI is used, it is consumed and cannot be reused.</li>
                    <li><strong style={{ color: 'var(--text-primary)' }}>Investment Continuity:</strong> Investments are slowed (v), never stopped (V_continue &gt; 0).</li>
                    <li><strong style={{ color: 'var(--text-primary)' }}>Budget Discipline:</strong> ΔB is always capped at 0.5B (except Tier 4, where 0.3B is recommended).</li>
                    <li><strong style={{ color: 'var(--text-primary)' }}>No Debt Dependency:</strong> Loans are optional (Tier 4) or tightly capped (Tier 5), never required.</li>
                    <li><strong style={{ color: 'var(--text-primary)' }}>Time Discipline:</strong> Each tier has strict time windows to prevent drift and fatigue.</li>
                </ol>
            </Section>

            {/* Decision Flow */}
            <Section title="Decision Flow">
                <ol style={{ margin: '12px 0', paddingLeft: '24px', color: 'var(--text-secondary)' }}>
                    <li><strong style={{ color: 'var(--text-primary)' }}>Identify X</strong> (cost of Life XP)</li>
                    <li><strong style={{ color: 'var(--text-primary)' }}>Determine tier</strong> based on X range</li>
                    <li><strong style={{ color: 'var(--text-primary)' }}>Check entry conditions</strong> (profit gate, corpus, etc.)</li>
                    <li><strong style={{ color: 'var(--text-primary)' }}>Calculate funding mix</strong> (VI, Vp, v, ΔB, Loan)</li>
                    <li><strong style={{ color: 'var(--text-primary)' }}>Verify time constraint</strong> (T within tier limits)</li>
                    <li><strong style={{ color: 'var(--text-primary)' }}>Execute with discipline</strong> (no mid-way rule changes)</li>
                </ol>
            </Section>

            <div style={{ marginTop: '40px', padding: '16px', background: 'var(--bg-panel)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                This guide consolidates all Life XP tiers into a single, non-repetitive framework for disciplined life experience funding.
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: '40px' }}>
            <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '16px',
                paddingBottom: '8px',
                borderBottom: '2px solid var(--border-color)',
                color: 'var(--text-primary)'
            }}>
                {title}
            </h2>
            {children}
        </div>
    );
}

function TierSection({
    tier,
    title,
    range,
    time,
    funding,
    note,
    children
}: {
    tier: number;
    title: string;
    range: string;
    time: string;
    funding: string;
    note?: string;
    children: React.ReactNode;
}) {
    const tierColors = [
        'var(--accent-primary)',
        'var(--accent-success)',
        'var(--accent-warning)',
        '#f59e0b',
        '#8b5cf6',
        '#ec4899'
    ];

    return (
        <div style={{
            marginBottom: '40px',
            padding: '20px',
            background: 'var(--bg-panel)',
            borderRadius: '8px',
            borderLeft: `4px solid ${tierColors[tier] || 'var(--accent-primary)'}`
        }}>
            <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: tierColors[tier] || 'var(--accent-primary)',
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '1rem'
                    }}>
                        {tier}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {title}
                    </h3>
                </div>
                <div style={{ marginLeft: '44px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <div><strong>Range:</strong> {range}</div>
                    <div><strong>Time:</strong> {time}</div>
                    <div><strong>Funding:</strong> {funding}</div>
                    {note && <div><strong>Note:</strong> {note}</div>}
                </div>
            </div>
            <div style={{ marginLeft: '44px' }}>
                {children}
            </div>
        </div>
    );
}

function RuleItem({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ marginBottom: '10px', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>{label}:</strong>
            <span style={{ color: 'var(--text-secondary)' }}>{value}</span>
        </div>
    );
}

function TableRow({
    tier,
    range,
    time,
    vi,
    vp,
    loan,
    constraint
}: {
    tier: string;
    range: string;
    time: string;
    vi: string;
    vp: string;
    loan: string;
    constraint: string;
}) {
    return (
        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
            <td style={{ padding: '10px', fontWeight: '600', color: 'var(--accent-primary)' }}>{tier}</td>
            <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{range}</td>
            <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{time}</td>
            <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{vi}</td>
            <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{vp}</td>
            <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{loan}</td>
            <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{constraint}</td>
        </tr>
    );
}
