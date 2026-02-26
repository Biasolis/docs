// frontend/src/pages/Admin/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Edit, Trash2, Eye } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmModal from '../../components/ConfirmModal';

export default function Dashboard() {
  const { user } = useAuth();
  // Apenas Editores ou superiores podem gerenciar artigos
  const canManageArticles = ['editor', 'admin', 'super_admin'].includes(user?.role);
  
  const [articles, setArticles] = useState([]);
  const [sectors, setSectors] = useState({}); // Vamos buscar os setores para montar o link correto
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null, title: '' });

  const fetchData = async () => {
    try {
      // Busca os artigos E os setores ao mesmo tempo para cruzar os dados
      const [articlesResponse, sectorsResponse] = await Promise.all([
        api.get('/articles'),
        api.get('/sectors')
      ]);

      setArticles(articlesResponse.data);

      // Cria um mapa/dicionário de setores { id_do_setor: 'slug-do-setor' }
      const sectorMap = {};
      sectorsResponse.data.forEach(sec => {
        sectorMap[sec.id] = sec.slug;
      });
      setSectors(sectorMap);

    } catch (error) {
      alert('Erro ao carregar os dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const requestDelete = (id, title) => setConfirmModal({ isOpen: true, id, title });

  const confirmDelete = async () => {
    try {
      await api.delete(`/articles/${confirmModal.id}`);
      setConfirmModal({ isOpen: false, id: null, title: '' });
      fetchData(); // Recarrega os artigos
    } catch (error) {
      alert('Falha ao apagar o artigo: ' + (error.response?.data?.message || ''));
      setConfirmModal({ isOpen: false, id: null, title: '' });
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'published_public': return <span className="status-publico">Público</span>;
      case 'published_internal': return <span className="status-interno">Interno (Setor)</span>;
      case 'published_internal_private': return <span className="status-privado" style={{ backgroundColor: '#f3e8ff', color: '#6b21a8' }}>Interno Privado</span>;
      case 'draft':
      default: return <span className="status-privado">Rascunho</span>;
    }
  };

  // Garante que TODOS os artigos tenham um botão de visualização (usando ID como fallback de segurança)
  const getArticleLink = (article) => {
    const secSlug = sectors[article.sector_id] || 'geral'; 
    const artIdentifier = article.slug || article.id;
    return `/artigos/${secSlug}/${artIdentifier}`;
  };

  return (
    <main className="admin-main">
      <div className="toolbar">
        <h1>Artigos da Documentação</h1>
        {canManageArticles && (
          <Link to="/admin/editor" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <PlusCircle size={18} /> Criar Novo Artigo
          </Link>
        )}
      </div>
      
      <div className="content-table">
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Autor</th>
              <th>Status</th>
              <th>Data de Criação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{textAlign: 'center'}}>A carregar...</td></tr>
            ) : articles.length === 0 ? (
              <tr><td colSpan="5" style={{textAlign: 'center'}}>Nenhum artigo encontrado.</td></tr>
            ) : (
              articles.map(article => (
                  <tr key={article.id}>
                    <td><strong>{article.title}</strong></td>
                    <td>{article.author_username}</td>
                    <td>{getStatusBadge(article.status)}</td>
                    <td>{new Date(article.created_at).toLocaleDateString('pt-PT')}</td>
                    <td className="actions">
                      
                      {/* BOTAO VER ATIVO PARA TODOS (Públicos, Privados e Rascunhos) */}
                      <Link to={getArticleLink(article)} target="_blank" rel="noreferrer" className="btn-view" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Eye size={14} /> Ver
                      </Link>
                      
                      {canManageArticles && (
                        <>
                          <Link to={`/admin/editor?id=${article.id}`} className="btn-edit" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', marginLeft: '8px' }}>
                            <Edit size={14} /> Editar
                          </Link>
                          <button onClick={() => requestDelete(article.id, article.title)} className="btn-danger-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
                            <Trash2 size={14} /> Apagar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal({ isOpen: false, id: null, title: '' })}
        onConfirm={confirmDelete}
        title="Apagar Artigo"
        message={`Tem a certeza que deseja apagar o artigo "${confirmModal.title}"?\nEsta ação irá remover o artigo permanentemente do sistema.`}
        confirmText="Sim, Apagar"
      />
    </main>
  );
}