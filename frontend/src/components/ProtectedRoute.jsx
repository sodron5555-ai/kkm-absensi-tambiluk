import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, allowRoles }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (allowRoles && !allowRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600">Akses Ditolak</h1>
          <p className="text-gray-600 mt-2">Halaman ini hanya untuk role: {allowRoles.join(', ')}</p>
        </div>
      </div>
    );
  }

  return children;
}
