// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AdminGuard from './components/AdminGuard';
import AdminLayout from './components/AdminLayout';

// Páginas
import SectorHub from './pages/Public/SectorHub';
import Home from './pages/Public/Home';
import Login from './pages/Admin/Login';
import Dashboard from './pages/Admin/Dashboard';
import Editor from './pages/Admin/Editor';
import Settings from './pages/Admin/Settings'; 
// 👇 IMPORTAÇÃO ADICIONADA AQUI
import PublicArticle from './pages/PublicArticle'; 

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* --- Hub Principal Multi-Setor --- */}
          <Route path="/" element={<SectorHub />} />
          
          {/* --- Central Específica do Setor --- */}
          <Route path="/central/:sectorSlug" element={<Home />} />

          {/* --- Artigo Público (Tela de Leitura) --- */}
          <Route path="/artigos/:sectorSlug/:articleSlug" element={<PublicArticle />} />
          
          {/* --- Painel Admin --- */}
          <Route path="/admin/login" element={<Login />} />

          <Route path="/admin" element={<AdminGuard />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="editor" element={<Editor />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}