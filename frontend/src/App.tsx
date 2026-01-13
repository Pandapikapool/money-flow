import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Daily from "./pages/Daily";
import Overview from "./pages/Overview";
import ExpensesOverview from "./pages/expenses/ExpensesOverview";
import ExpensesYear from "./pages/expenses/ExpensesYear";
import ExpensesMonth from "./pages/expenses/ExpensesMonth";
import BudgetOverview from "./pages/budget/BudgetOverview";
import BudgetYear from "./pages/budget/BudgetYear";
import BudgetMonth from "./pages/budget/BudgetMonth";
import TagsPage from "./pages/tags/TagsPage";
import AccountsPage from "./pages/AccountsPage";
import AssetsPage from "./pages/AssetsPage";
import PlansPage from "./pages/PlansPage";
import LifeXpPage from "./pages/LifeXpPage";
import InvestmentsPage from "./pages/InvestmentsPage";
import FixedReturnsPage from "./pages/FixedReturnsPage";
import SIPPage from "./pages/SIPPage";
import RecurringDepositsPage from "./pages/RecurringDepositsPage";
import StocksPage from "./pages/StocksPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="overview" element={<Overview />} />
          <Route path="daily" element={<Daily />} />

          <Route path="expenses">
            <Route index element={<ExpensesOverview />} />
            <Route path=":year" element={<ExpensesYear />} />
            <Route path=":year/:month" element={<ExpensesMonth />} />
          </Route>

          <Route path="budget">
            <Route index element={<BudgetOverview />} />
            <Route path=":year" element={<BudgetYear />} />
            <Route path=":year/:month" element={<BudgetMonth />} />
          </Route>

          <Route path="accounts" element={<AccountsPage />} />
          <Route path="assets" element={<AssetsPage title="Assets" type="asset" />} />
          <Route path="plans" element={<PlansPage />} />

          <Route path="investments">
            <Route index element={<InvestmentsPage />} />
            <Route path="fixed" element={<FixedReturnsPage />} />
            <Route path="sip" element={<SIPPage />} />
            <Route path="rd" element={<RecurringDepositsPage />} />
            <Route path="stocks/:market" element={<StocksPage />} />
          </Route>

          <Route path="life-xp" element={<LifeXpPage />} />

          <Route path="tags" element={<TagsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
