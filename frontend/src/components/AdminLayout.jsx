// frontend/src/components/AdminLayout.jsx
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Settings, ExternalLink, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import useDarkMode from '../hooks/useDarkMode';
import '../assets/admin.css';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useDarkMode();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <>
      <header className="admin-header">
        <div className="header-container">
          <div className="logo-container">
            <img alt="Logo" className="admin-logo" src="/images/logo.old.png" />
            <h2>Painel de Documentação</h2>
          </div>
          
          <nav>
            <span className="user-info">Olá, {user?.username}</span>
            
            <Link to="/admin/dashboard" className={`nav-link ${location.pathname === '/admin/dashboard' ? 'active' : ''}`}>
              <FileText size={16} /> Artigos
            </Link>
            
            <Link to="/admin/settings" className={`nav-link ${location.pathname === '/admin/settings' ? 'active' : ''}`}>
              <Settings size={16} /> Configurações
            </Link>
            
            <Link to="/" target="_blank" className="nav-link">
              <ExternalLink size={16} /> Ver Site
            </Link>

            <div className="theme-switch-wrapper" style={{ marginLeft: '10px' }}>
              <label className="theme-switch" htmlFor="darkModeToggle">
                <input type="checkbox" id="darkModeToggle" checked={isDark} onChange={toggleTheme} />
                <span className="slider round"></span>
              </label>
            </div>
            
            <button onClick={handleLogout} className="btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '10px' }}>
              <LogOut size={16} /> Sair
            </button>
          </nav>
        </div>
      </header>

      {/* O <Outlet /> é onde as páginas específicas serão injetadas */}
      <Outlet />
    </>
  );
}