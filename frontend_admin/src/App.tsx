import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import DbBrowserPage from './pages/DbBrowserPage';
import LoginPage from './pages/LoginPage';
import PromptLabPage from './pages/PromptLabPage';
import { adminApiClient } from './services/adminApiClient';

function ProtectedRoute({ children }: { children: ReactNode }) {
  if (!adminApiClient.hasKey()) {
    return <Navigate to="/login" replace />;
  }
  return <AdminLayout>{children}</AdminLayout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/db"
        element={
          <ProtectedRoute>
            <DbBrowserPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/db/:tableName"
        element={
          <ProtectedRoute>
            <DbBrowserPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/prompt-lab"
        element={
          <ProtectedRoute>
            <PromptLabPage />
          </ProtectedRoute>
        }
      />

      {/* Default redirect */}
      <Route path="*" element={<Navigate to={adminApiClient.hasKey() ? '/db' : '/login'} replace />} />
    </Routes>
  );
}
