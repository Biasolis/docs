// frontend/src/pages/Admin/SettingsTabs/GlobalArticlesTab.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Trash2, Eye } from 'lucide-react';
import api from '../../../services/api';
import ConfirmModal from '../../../components/ConfirmModal';

export default function GlobalArticlesTab() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null, title: '' });

  const fetchGlobalArticles = async () => {
    try {
      const response = await api.get('/articles/global');
      setArticles(response.data);
    } catch (error) { alert('Erro ao carregar os artigos globais.'); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchGlobalArticles(); }, []);

  const requestDelete = (id, title) => setConfirmModal({ isOpen: true, id, title });

  const confirmDelete = async () => {
    try {
      await api.delete(`/articles/${confirmModal.id}`);
      setConfirmModal({ isOpen: false, id: null, title: '' });
      fetchGlobalArticles();
    } catch (error) {
      alert('Falha ao apagar o artigo: ' + (error.response?.data?.message || ''));
      setConfirmModal({ isOpen: false, id: null, title: '' });
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'published_public': return <span className="status-publico">Público</span>;
      case 'published_internal': return <span className="status-interno">Interno</span>;
      case 'published_internal_private': return <span className="status-privado" style={{ backgroundColor: '#f3e8ff', color: '#6b21a8' }}>Interno Privado</span>;
      case 'draft': default: return <span className="status-privado">Rascunho</span>;
    }
  };

  return (
    <>
      <div className="section-header"><h3>Visão Global de Artigos</h3></div>
      <div className="content-table">
        <table>
          <thead>
            <tr><th>Setor</th><th>Título</th><th>Autor</th><th>Status</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="5" style={{textAlign: 'center'}}>A carregar...</td></tr> : 
             articles.length === 0 ? <tr><td colSpan="5" style={{textAlign: 'center'}}>Nenhum artigo encontrado.</td></tr> : (
              articles.map(article => (
                <tr key={article.id}>
                  <td><span style={{ fontWeight: 600, color: '#007bff' }}>{article.sector_name}</span></td>
                  <td><strong>{article.title}</strong></td>
                  <td>{article.author_username}</td>
                  <td>{getStatusBadge(article.status)}</td>
                  <td className="actions">
                    {/* BOTÃO VER ADICIONADO AQUI */}
                    <a href={`/central/${article.sector_slug}#artigo-${article.id}`} target="_blank" rel="noreferrer" className="btn-view" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Eye size={14} /> Ver
                    </a>
                    <Link to={`/admin/editor?id=${article.id}`} className="btn-edit" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                      <Edit size={14} /> Editar
                    </Link>
                    <button onClick={() => requestDelete(article.id, article.title)} className="btn-danger-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Trash2 size={14} /> Apagar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <ConfirmModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ isOpen: false, id: null, title: '' })} onConfirm={confirmDelete} title="Apagar Artigo Global" message={`Atenção Super Admin: Tem a certeza que deseja apagar o artigo "${confirmModal.title}"?`} confirmText="Sim, Apagar" />
    </>
  );
}