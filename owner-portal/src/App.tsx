import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { OwnerPortalProvider } from "./components/OwnerPortalProvider";
import { OwnerRouteGuard } from "./components/OwnerRouteGuard";
import { OwnerShell } from "./components/OwnerShell";
import AdminsPage from "./pages/Admins";
import CompaniesPage from "./pages/Companies";
import DashboardPage from "./pages/Dashboard";
import DevicesPage from "./pages/Devices";
import LicensesPage from "./pages/Licenses";
import LoginPage from "./pages/Login";

export default function App() {
  return (
    <OwnerPortalProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<OwnerRouteGuard />}>
            <Route path="/" element={<OwnerShell />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="companies" element={<CompaniesPage />} />
              <Route path="admins" element={<AdminsPage />} />
              <Route path="licenses" element={<LicensesPage />} />
              <Route path="devices" element={<DevicesPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </OwnerPortalProvider>
  );
}
