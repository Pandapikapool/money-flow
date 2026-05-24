import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchInsights,
    fetchFlowcraftState,
    fetchActiveGoal,
    createGoal,
    cancelGoal,
    confirmRecurring,
    dismissRecurring,
    type Insight,
    type CreateGoalPayload,
} from "../lib/flowcraft";
import InsightCard from "../components/InsightCard";
import Mascot from "../components/Mascot";
import Garden from "../components/Garden";
import GoalCard from "../components/GoalCard";
import GoalPicker from "../components/GoalPicker";

export default function FlowPage() {
    const queryClient = useQueryClient();
    const [pickerOpen, setPickerOpen] = useState(false);

    const { data: insights, isLoading: insightsLoading } = useQuery({
        queryKey: ['flowcraft-insights'],
        queryFn: fetchInsights,
    });

    const { data: state } = useQuery({
        queryKey: ['flowcraft-state'],
        queryFn: fetchFlowcraftState,
    });

    const { data: activeGoal } = useQuery({
        queryKey: ['flowcraft-active-goal'],
        queryFn: fetchActiveGoal,
    });

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ['flowcraft-insights'] });
        queryClient.invalidateQueries({ queryKey: ['flowcraft-state'] });
        queryClient.invalidateQueries({ queryKey: ['flowcraft-active-goal'] });
    };

    const createGoalMut = useMutation({
        mutationFn: (payload: CreateGoalPayload) => createGoal(payload),
        onSuccess: () => {
            setPickerOpen(false);
            invalidateAll();
        },
    });

    const cancelGoalMut = useMutation({
        mutationFn: (id: number) => cancelGoal(id),
        onSuccess: () => {
            invalidateAll();
        },
    });

    const confirmMut = useMutation({
        mutationFn: (payload: { signature: string; sample: string; amount: number; cadenceDays: number }) =>
            confirmRecurring(payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flowcraft-insights'] }),
    });

    const dismissMut = useMutation({
        mutationFn: (signature: string) => dismissRecurring(signature),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flowcraft-insights'] }),
    });

    const handlePrimary = (insight: Insight) => {
        if (insight.kind === 'recurring' && insight.action?.payload) {
            const p = insight.action.payload as {
                signature: string;
                sample: string;
                amount: number;
                cadenceDays: number;
            };
            confirmMut.mutate(p);
        } else if (insight.action?.href) {
            window.location.href = insight.action.href;
        }
    };

    const handleDismiss = (insight: Insight) => {
        if (insight.kind === 'recurring' && insight.action?.payload) {
            const p = insight.action.payload as { signature: string };
            dismissMut.mutate(p.signature);
        }
    };

    const coinMessage = (() => {
        if (!insights) return undefined;
        if (insights.length === 0) return "Quiet here. Nothing demanding your attention.";
        const compassionate = insights.find(i => i.tone === 'compassionate');
        if (compassionate) return compassionate.body;
        const calm = insights.find(i => i.kind === 'usual');
        if (calm) return "Looks steady. I'd rest if I were you.";
        return undefined;
    })();

    return (
        <div style={{
            maxWidth: '760px',
            margin: '0 auto',
            padding: '8px 0 40px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
        }}>
            {/* Header */}
            <header style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <img src="/logo.svg" alt="" width="44" height="44" style={{ flexShrink: 0 }} />
                <div>
                    <h1 style={{
                        fontSize: '1.5rem',
                        fontWeight: 600,
                        margin: 0,
                        color: 'var(--text-primary)',
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        letterSpacing: '-0.01em',
                    }}>
                        Flow
                    </h1>
                    <div style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        marginTop: '2px',
                    }}>
                        a calm look at this week
                    </div>
                </div>
            </header>

            {/* Goal tile */}
            <GoalCard
                activeGoal={activeGoal ?? null}
                onPickClicked={() => setPickerOpen(true)}
                onCancel={(id) => cancelGoalMut.mutate(id)}
            />

            {/* Garden + Mascot tile */}
            <section className="glass-panel" style={{
                padding: '28px 24px',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-around',
                alignItems: 'flex-end',
                gap: '24px',
            }}>
                {state ? (
                    <Garden stage={state.garden_stage} variant={state.garden_variant} />
                ) : (
                    <div style={{ width: 120 }} />
                )}
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <Mascot message={coinMessage} />
                </div>
            </section>

            {/* Insights stream */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h2 style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    fontWeight: 500,
                    margin: 0,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                }}>
                    This week
                </h2>
                {insightsLoading && (
                    <div style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.9rem',
                        padding: '16px 0',
                        fontStyle: 'italic',
                    }}>
                        Loading quietly…
                    </div>
                )}
                {insights && insights.length === 0 && (
                    <div className="glass-panel" style={{
                        padding: '24px',
                        textAlign: 'center',
                        color: 'var(--text-secondary)',
                        fontStyle: 'italic',
                    }}>
                        Nothing to surface today. That's allowed.
                    </div>
                )}
                {insights?.map((insight, i) => (
                    <InsightCard
                        key={`${insight.kind}-${i}`}
                        insight={insight}
                        onPrimaryAction={handlePrimary}
                        onDismiss={handleDismiss}
                    />
                ))}
            </section>

            {pickerOpen && (
                <GoalPicker
                    onCreate={(payload) => createGoalMut.mutate(payload)}
                    onClose={() => setPickerOpen(false)}
                />
            )}
        </div>
    );
}
