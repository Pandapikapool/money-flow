import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";

// Lightweight pages — load eagerly
import Daily from "./pages/Daily";
import ExpensesOverview from "./pages/expenses/ExpensesOverview";
import BudgetOverview from "./pages/budget/BudgetOverview";
import BudgetYear from "./pages/budget/BudgetYear";
import BudgetMonth from "./pages/budget/BudgetMonth";
import TagsPage from "./pages/tags/TagsPage";

// Heavy pages — code-split
const Overview             = lazy(() => import("./pages/Overview"));
const ExpensesYear         = lazy(() => import("./pages/expenses/ExpensesYear"));
const ExpensesMonth        = lazy(() => import("./pages/expenses/ExpensesMonth"));
const AccountsPage         = lazy(() => import("./pages/AccountsPage"));
const AssetsPage           = lazy(() => import("./pages/AssetsPage"));
const PlansPage            = lazy(() => import("./pages/PlansPage"));
const LifeXpPage           = lazy(() => import("./pages/LifeXpPage"));
const InvestmentsPage      = lazy(() => import("./pages/InvestmentsPage"));
const PortfolioPage        = lazy(() => import("./pages/PortfolioPage"));
const FixedReturnsPage     = lazy(() => import("./pages/FixedReturnsPage"));
const SIPPage              = lazy(() => import("./pages/SIPPage"));
const RecurringDepositsPage = lazy(() => import("./pages/RecurringDepositsPage"));
const StocksPage           = lazy(() => import("./pages/StocksPage"));
const SearchPage           = lazy(() => import("./pages/SearchPage"));
const FlowPage             = lazy(() => import("./pages/FlowPage"));
const JournalPage          = lazy(() => import("./pages/JournalPage"));
const MoneyStoryPage       = lazy(() => import("./pages/MoneyStoryPage"));

const PageLoader = () => (
    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        Loading…
    </div>
);

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<MainLayout />}>
                    <Route index element={<Navigate to="/overview" replace />} />

                    <Route path="overview" element={
                        <Suspense fallback={<PageLoader />}><Overview /></Suspense>
                    } />

                    <Route path="daily" element={<Daily />} />

                    <Route path="flow" element={
                        <Suspense fallback={<PageLoader />}><FlowPage /></Suspense>
                    } />

                    <Route path="flow/journal" element={
                        <Suspense fallback={<PageLoader />}><JournalPage /></Suspense>
                    } />

                    <Route path="flow/story" element={
                        <Suspense fallback={<PageLoader />}><MoneyStoryPage /></Suspense>
                    } />

                    <Route path="search" element={
                        <Suspense fallback={<PageLoader />}><SearchPage /></Suspense>
                    } />

                    <Route path="expenses">
                        <Route index element={<ExpensesOverview />} />
                        <Route path=":year" element={
                            <Suspense fallback={<PageLoader />}><ExpensesYear /></Suspense>
                        } />
                        <Route path=":year/:month" element={
                            <Suspense fallback={<PageLoader />}><ExpensesMonth /></Suspense>
                        } />
                    </Route>

                    <Route path="budget">
                        <Route index element={<BudgetOverview />} />
                        <Route path=":year" element={<BudgetYear />} />
                        <Route path=":year/:month" element={<BudgetMonth />} />
                    </Route>

                    <Route path="accounts" element={
                        <Suspense fallback={<PageLoader />}><AccountsPage /></Suspense>
                    } />
                    <Route path="assets" element={
                        <Suspense fallback={<PageLoader />}><AssetsPage title="Assets" type="asset" /></Suspense>
                    } />
                    <Route path="plans" element={
                        <Suspense fallback={<PageLoader />}><PlansPage /></Suspense>
                    } />

                    <Route path="investments">
                        <Route index element={
                            <Suspense fallback={<PageLoader />}><InvestmentsPage /></Suspense>
                        } />
                        <Route path="portfolio" element={
                            <Suspense fallback={<PageLoader />}><PortfolioPage /></Suspense>
                        } />
                        <Route path="fixed" element={
                            <Suspense fallback={<PageLoader />}><FixedReturnsPage /></Suspense>
                        } />
                        <Route path="sip" element={
                            <Suspense fallback={<PageLoader />}><SIPPage /></Suspense>
                        } />
                        <Route path="rd" element={
                            <Suspense fallback={<PageLoader />}><RecurringDepositsPage /></Suspense>
                        } />
                        <Route path="stocks/:market" element={
                            <Suspense fallback={<PageLoader />}><StocksPage /></Suspense>
                        } />
                    </Route>

                    <Route path="life-xp" element={
                        <Suspense fallback={<PageLoader />}><LifeXpPage /></Suspense>
                    } />

                    <Route path="tags" element={<TagsPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
