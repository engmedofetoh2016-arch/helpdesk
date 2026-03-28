import { Navigate, Route, Routes } from "react-router";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import AgentOnlyRoute from "./components/AgentOnlyRoute";
import PortalOnlyRoute from "./components/PortalOnlyRoute";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import UsersPage from "./pages/UsersPage";
import TicketsPage from "./pages/TicketsPage";
import NewTicketPage from "./pages/NewTicketPage";
import TicketDetailPage from "./pages/TicketDetailPage";
import PortalTicketsPage from "./pages/PortalTicketsPage";
import PortalNewTicketPage from "./pages/PortalNewTicketPage";
import PortalTicketDetailPage from "./pages/PortalTicketDetailPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route element={<AgentOnlyRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/tickets/new" element={<NewTicketPage />} />
            <Route path="/tickets/:id" element={<TicketDetailPage />} />
            <Route element={<AdminRoute />}>
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>
          <Route path="/portal" element={<PortalOnlyRoute />}>
            <Route index element={<PortalTicketsPage />} />
            <Route path="new" element={<PortalNewTicketPage />} />
            <Route path="tickets/:id" element={<PortalTicketDetailPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
