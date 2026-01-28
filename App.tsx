
import React from 'react';
import { HashRouter, Switch, Route, Redirect, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PermissionProvider } from './context/PermissionContext';
import Dashboard from './pages/Dashboard';
import PolicyForm from './pages/PolicyForm';
import PolicyWording from './pages/PolicyWording';
import ClauseManager from './pages/ClauseManager';
import SlipsDashboard from './pages/SlipsDashboard';
import SlipForm from './pages/SlipForm';
import Settings from './pages/Settings';
import AdminConsole from './pages/AdminConsole';
import Login from './pages/Login';
import EntityManager from './pages/EntityManager';
import EntityForm from './pages/EntityForm';
import ClaimsList from './pages/ClaimsList';
import ClaimDetail from './pages/ClaimDetail';
import Agenda from './pages/Agenda';

// Protected Route Component
const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading Session...</div>;
  }

  if (!isAuthenticated) {
    return <Redirect to={{ pathname: "/login", state: { from: location } }} />;
  }

  return <>{children}</>;
};

// Admin Route Component (Now enhanced by Permission logic inside AdminConsole, but kept for high level protection)
const AdminRoute = ({ children }: { children?: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null;

  // Basic role check fallback, Permissions handled deeper
  if (user?.role !== 'Super Admin' && user?.role !== 'Admin') {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Switch>
      <Route path="/login">
        <Login />
      </Route>

      {/* Standalone Admin Platform */}
      <Route path="/admin">
        <ProtectedRoute>
          <AdminRoute>
            <AdminConsole />
          </AdminRoute>
        </ProtectedRoute>
      </Route>

      {/* Main Application - Wrapped in Layout */}
      <Route path="/">
        <ProtectedRoute>
          <Layout>
            <Switch>
              <Route exact path="/">
                <Dashboard />
              </Route>
              <Route path="/new">
                <PolicyForm />
              </Route>
              <Route path="/edit/:id">
                <PolicyForm />
              </Route>
              <Route path="/wording/:id">
                <PolicyWording />
              </Route>
              <Route path="/clauses">
                <ClauseManager />
              </Route>
              
              {/* Slips Routes */}
              <Route exact path="/slips">
                <SlipsDashboard />
              </Route>
              <Route path="/slips/new">
                <SlipForm />
              </Route>
              <Route path="/slips/edit/:id">
                <SlipForm />
              </Route>

              {/* Claims Routes */}
              <Route exact path="/claims">
                <ClaimsList />
              </Route>
              <Route path="/claims/:id">
                <ClaimDetail />
              </Route>

              {/* Legal Entities Routes */}
              <Route exact path="/entities">
                <EntityManager />
              </Route>
              <Route path="/entities/new">
                <EntityForm />
              </Route>
              <Route path="/entities/edit/:id">
                <EntityForm />
              </Route>
              
              {/* Agenda / Tasks */}
              <Route path="/agenda">
                <Agenda />
              </Route>
              
              <Route path="/settings">
                <Settings />
              </Route>
              
              <Route path="*">
                <Redirect to="/" />
              </Route>
            </Switch>
          </Layout>
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <PermissionProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </PermissionProvider>
    </AuthProvider>
  );
};

export default App;
