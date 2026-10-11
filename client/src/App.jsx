import { Navigate, Route, Routes } from 'react-router-dom';
import { GuestOnly, ProtectedRoute } from './components/routing/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CatalogPage from './pages/participant/CatalogPage';
import LobbyPage from './pages/participant/LobbyPage';
import SolvePage from './pages/participant/SolvePage';
import ResultsPage from './pages/participant/ResultsPage';
import ResultsHubPage from './pages/participant/ResultsHubPage';
import WaitingHubPage from './pages/participant/WaitingHubPage';
import SolveHubPage from './pages/participant/SolveHubPage';
import MyOlympiadsPage from './pages/developer/MyOlympiadsPage';
import ConstructorPage from './pages/developer/ConstructorPage';
import LifecyclePage from './pages/developer/LifecyclePage';
import DevResultsPage from './pages/developer/DevResultsPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import UsersPage from './pages/admin/UsersPage';
import AllOlympiadsPage from './pages/admin/AllOlympiadsPage';
import AdminResultsPage from './pages/admin/AdminResultsPage';
import ProfilePage from './pages/ProfilePage';
import HelpPage from './pages/HelpPage';
import UiKitPage from './pages/UiKitPage';

export default function App() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/olympiads/:id" element={<LobbyPage />} />
        <Route path="/olympiads/:id/lobby" element={<LobbyPage />} />
        <Route path="/olympiads/:id/solve" element={<SolvePage />} />
        <Route path="/olympiads/:id/results" element={<ResultsPage />} />
        <Route path="/results" element={<ResultsHubPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/ui-kit" element={<UiKitPage />} />

        <Route element={<ProtectedRoute roles={['PARTICIPANT', 'ADMIN']} />}>
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/waiting" element={<WaitingHubPage />} />
          <Route path="/solve-hub" element={<SolveHubPage />} />
        </Route>

        <Route element={<ProtectedRoute roles={['DEVELOPER', 'ADMIN']} />}>
          <Route path="/dev/olympiads" element={<MyOlympiadsPage />} />
          <Route
            path="/dev/olympiads/:id"
            element={<Navigate to="constructor" relative="path" replace />}
          />
          <Route path="/dev/olympiads/:id/constructor" element={<ConstructorPage />} />
          <Route path="/dev/olympiads/:id/lifecycle" element={<LifecyclePage />} />
          <Route path="/dev/olympiads/:id/results" element={<DevResultsPage />} />
        </Route>

        <Route element={<ProtectedRoute roles={['ADMIN']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="/admin/olympiads" element={<AllOlympiadsPage />} />
          <Route path="/admin/results" element={<AdminResultsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
