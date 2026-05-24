import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppStore {
    theme: 'dark' | 'light';
    setTheme: (theme: 'dark' | 'light') => void;
    toggleTheme: () => void;

    plansActionCount: number;
    setPlansActionCount: (count: number) => void;

    lifeXpActionCount: number;
    setLifeXpActionCount: (count: number) => void;

    isQuickAddOpen: boolean;
    openQuickAdd: () => void;
    closeQuickAdd: () => void;
}

export const useAppStore = create<AppStore>()(
    persist(
        (set, get) => ({
            theme: 'light',
            setTheme: (theme) => {
                document.documentElement.setAttribute('data-theme', theme);
                set({ theme });
            },
            toggleTheme: () => {
                const next = get().theme === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', next);
                set({ theme: next });
            },

            plansActionCount: 0,
            setPlansActionCount: (count) => set({ plansActionCount: count }),

            lifeXpActionCount: 0,
            setLifeXpActionCount: (count) => set({ lifeXpActionCount: count }),

            isQuickAddOpen: false,
            openQuickAdd: () => set({ isQuickAddOpen: true }),
            closeQuickAdd: () => set({ isQuickAddOpen: false }),
        }),
        {
            name: 'moneyflow-app',
            partialize: (state) => ({ theme: state.theme }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    document.documentElement.setAttribute('data-theme', state.theme);
                }
            },
        }
    )
);
