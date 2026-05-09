import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import DeviceTestPage from './pages/DeviceTestPage';
import HistoryPage from './pages/HistoryPage';
import PreparationPage from './pages/PreparationPage';
import RecordingPage from './pages/RecordingPage';
import ReportDetailPage from './pages/ReportDetailPage';
import WaitingPage from './pages/WaitingPage';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<AuthPage />} />

      {/* Protected */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/device-test"
        element={
          <ProtectedRoute>
            <DeviceTestPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/interview/prepare"
        element={
          <ProtectedRoute>
            <PreparationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/interview/record"
        element={
          <ProtectedRoute>
            <RecordingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/interview/wait"
        element={
          <ProtectedRoute>
            <WaitingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/:reportId"
        element={
          <ProtectedRoute>
            <ReportDetailPage />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<AuthPage />} />
    </Routes>
  );
}
