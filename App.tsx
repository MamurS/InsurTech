
import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
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
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading Session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Admin Route Component
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null;

  if (user?.role !== 'Super Admin' && user?.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Standalone Admin Platform */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminConsole />
            </AdminRoute>
          </ProtectedRoute>
        }
      />

      {/* Main Application - Wrapped in Layout */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/new" element={<PolicyForm />} />
                <Route path="/edit/:id" element={<PolicyForm />} />
                <Route path="/wording/:id" element={<PolicyWording />} />
                <Route path="/clauses" element={<ClauseManager />} />
                
                {/* Slips Routes */}
                <Route path="/slips" element={<SlipsDashboard />} />
                <Route path="/slips/new" element={<SlipForm />} />
                <Route path="/slips/edit/:id" element={<SlipForm />} />

                {/* Claims Routes */}
                <Route path="/claims" element={<ClaimsList />} />
                <Route path="/claims/:id" element={<ClaimDetail />} />

                {/* Legal Entities Routes */}
                <Route path="/entities" element={<EntityManager />} />
                <Route path="/entities/new" element={<EntityForm />} />
                <Route path="/entities/edit/:id" element={<EntityForm />} />
                
                {/* Agenda / Tasks */}
                <Route path="/agenda" element={<Agenda />} />
                
                <Route path="/settings" element={<Settings />} />
                
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
};

export default App;
