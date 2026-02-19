// frontend/src/pages/Admin/Settings.jsx
import { useState } from 'react';
import { User, Users, Tags, Settings as SettingsIcon, Layers, Globe, Bot } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import ProfileTab from './SettingsTabs/ProfileTab';
import UsersTab from './SettingsTabs/UsersTab';
import CategoriesTab from './SettingsTabs/CategoriesTab';
import SectorsTab from './SettingsTabs/SectorsTab';
import GlobalArticlesTab from './SettingsTabs/GlobalArticlesTab';
import AiSettingsTab from './SettingsTabs/AiSettingsTab'; // NOVO

export default function Settings() {
  const { user } = useAuth();
  
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;
  const isEditor = user?.role === 'editor' || isAdmin;
  
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <main className="admin-main">
      <div className="toolbar">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <SettingsIcon size={24} /> Configurações
        </h1>
      </div>

      <div className="settings-container">
        <aside className="settings-sidebar">
          <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>
            <User size={18} /> Meu Perfil
          </button>
          
          {isAdmin && (
            <>
              <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
                <Users size={18} /> Gestão de Utilizadores
              </button>
              
              <button className={activeTab === 'ai' ? 'active' : ''} onClick={() => setActiveTab('ai')}>
                <Bot size={18} /> Assistente de IA
              </button>
            </>
          )}
          
          {isEditor && (
            <button className={activeTab === 'categories' ? 'active' : ''} onClick={() => setActiveTab('categories')}>
              <Tags size={18} /> Categorias
            </button>
          )}
          
          {isSuperAdmin && (
            <>
              <button className={activeTab === 'sectors' ? 'active' : ''} onClick={() => setActiveTab('sectors')}>
                <Layers size={18} /> Gestão de Setores
              </button>
              <button className={activeTab === 'global_articles' ? 'active' : ''} onClick={() => setActiveTab('global_articles')}>
                <Globe size={18} /> Artigos Globais
              </button>
            </>
          )}
        </aside>

        <div className="settings-content">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'users' && isAdmin && <UsersTab />}
          {activeTab === 'ai' && isAdmin && <AiSettingsTab />}
          {activeTab === 'categories' && isEditor && <CategoriesTab />}
          {activeTab === 'sectors' && isSuperAdmin && <SectorsTab />}
          {activeTab === 'global_articles' && isSuperAdmin && <GlobalArticlesTab />}
        </div>
      </div>
    </main>
  );
}