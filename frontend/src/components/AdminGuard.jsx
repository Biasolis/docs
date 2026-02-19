// frontend/src/components/AdminGuard.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AdminGuard({ requireAdmin = false }) {
  const { user, token, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>A carregar...</div>;
  }

  // 1. O utilizador está logado? (Substitui o auth.js antigo)
  if (!token || !user) {
    return <Navigate to="/admin/login" replace />;
  }

  // 2. O utilizador é ADMIN para esta rota específica? (Substitui o admin-guard.js antigo)
  if (requireAdmin && user.role !== 'admin') {
    alert('Acesso negado. Não tem permissão de administrador para aceder a esta página.');
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Se passou em todas as verificações, mostra as páginas filhas
  return <Outlet />;
}