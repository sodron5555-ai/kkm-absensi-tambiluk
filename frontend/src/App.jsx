import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AbsenScanRedirect from './pages/AbsenScanRedirect.jsx';
import AbsenCheckin from './pages/AbsenCheckin.jsx';
import QRDisplay from './pages/QRDisplay.jsx';
import AdminAttendance from './pages/AdminAttendance.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/absen-scan"
        element={
          <ProtectedRoute>
            <AbsenScanRedirect />
          </ProtectedRoute>
        }
      />

      {/* Halaman ini yang dibuka lewat scan QR fisik / link absensi */}
      <Route
        path="/absen/:token"
        element={
          <ProtectedRoute>
            <AbsenCheckin />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/qr/:token"
        element={
          <ProtectedRoute allowRoles={['KETUA', 'WAKIL', 'SEKRETARIS']}>
            <QRDisplay />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/absensi"
        element={
          <ProtectedRoute allowRoles={['KETUA', 'SEKRETARIS', 'BENDAHARA']}>
            <AdminAttendance />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
