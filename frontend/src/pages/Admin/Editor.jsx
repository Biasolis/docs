// frontend/src/pages/Admin/Editor.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Save, Settings, Tags, Clock, ArrowLeft, RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import { Editor as ToastEditor } from '@toast-ui/react-editor';
import '@toast-ui/editor/dist/toastui-editor.css';
import '@toast-ui/editor/dist/theme/toastui-editor-dark.css';
import api from '../../services/api';
import useDarkMode from '../../hooks/useDarkMode';
import ConfirmModal from '../../components/ConfirmModal'; // IMPORT DO MODAL (Ajuste o caminho se necessário)

export default function Editor() {
  const [searchParams] = useSearchParams();
  const articleId = searchParams.get('id');
  const isEditing = !!articleId;
  const navigate = useNavigate();
  const { isDark } = useDarkMode();
  const editorRef = useRef(null);

  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('draft');
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [initialMarkdown, setInitialMarkdown] = useState(''); 
  const [loading, setLoading] = useState(isEditing);

  const [lastSaved, setLastSaved] = useState(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [formMessage, setFormMessage] = useState({ text: '', type: '' });

  // NOVOS ESTADOS PARA O TREINAMENTO DA IA
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
  const [isTrainingInProgress, setIsTrainingInProgress] = useState(false);
  
  const storageKey = `editorDraft_${isEditing ? articleId : 'new'}`;

  useEffect(() => {
    api.get('/categories').then(res => setCategories(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEditing) {
      const fetchArticle = async () => {
        try {
          const res = await api.get(`/articles/${articleId}`);
          const article = res.data;
          setTitle(article.title);
          setStatus(article.status);
          setSelectedCategories(article.category_ids || []);
          setInitialMarkdown(article.content_markdown || '');
          checkLocalDraft(article.updated_at);
        } catch (err) {
          alert('Erro ao carregar artigo.');
          navigate('/admin/dashboard');
        } finally {
          setLoading(false); 
        }
      };
      fetchArticle();
    } else {
      checkLocalDraft();
    }
  }, [articleId, isEditing, navigate]);

  const checkLocalDraft = (serverUpdatedAt = null) => {
    const draftStr = localStorage.getItem(storageKey);
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr);
        if (!serverUpdatedAt || draft.timestamp > new Date(serverUpdatedAt).getTime()) {
          setHasDraft(draft.timestamp);
        } else { localStorage.removeItem(storageKey); }
      } catch (e) { localStorage.removeItem(storageKey); }
    }
  };

  const saveLocalDraft = () => {
    if (!editorRef.current) return;
    const currentMarkdown = editorRef.current.getInstance().getMarkdown();
    if (!title.trim() && !currentMarkdown.trim()) return;
    const draft = { title, status, category_ids: selectedCategories, contentMarkdown: currentMarkdown, timestamp: Date.now() };
    localStorage.setItem(storageKey, JSON.stringify(draft));
    setLastSaved(new Date());
  };

  useEffect(() => {
    if (loading) return;
    const interval = setInterval(saveLocalDraft, 15000);
    return () => clearInterval(interval);
  }, [title, status, selectedCategories, loading]);

  const restoreDraft = () => {
    const draftStr = localStorage.getItem(storageKey);
    if (draftStr) {
      const draft = JSON.parse(draftStr);
      setTitle(draft.title);
      setStatus(draft.status);
      setSelectedCategories(draft.category_ids || []);
      if (editorRef.current) {
        editorRef.current.getInstance().setMarkdown(draft.contentMarkdown);
      }
      setHasDraft(false);
    }
  };

  const discardDraft = () => {
    localStorage.removeItem(storageKey);
    setHasDraft(false);
  };

  const onUploadImage = async (blob, callback) => {
    const formData = new FormData();
    formData.append('image', blob);
    try {
      const res = await api.post('/articles/upload-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      callback(res.data.url, 'Imagem');
    } catch (err) { setFormMessage({ text: 'Erro ao fazer upload da imagem.', type: 'error' }); }
  };

  const handleCategoryToggle = (catId) => {
    setSelectedCategories(prev => prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]);
  };

  // FUNÇÃO ATUALIZADA: Dispara o Modal de Treino se o artigo for público
  const handleSave = async () => {
    if (!editorRef.current) return;
    const contentMarkdown = editorRef.current.getInstance().getMarkdown();
    setFormMessage({ text: '', type: '' });

    if (!title.trim() || !contentMarkdown.trim()) {
      setFormMessage({ text: 'O título e o conteúdo são obrigatórios.', type: 'error' });
      return;
    }

    const payload = { title, content_markdown: contentMarkdown, status, category_ids: selectedCategories };

    try {
      if (isEditing) await api.put(`/articles/${articleId}`, payload);
      else await api.post('/articles', payload);
      
      localStorage.removeItem(storageKey);
      
      // Se for Público, abre o Modal para treinar a IA. Se não, apenas salva e volta.
      if (status === 'published_public') {
          setIsTrainingModalOpen(true);
      } else {
          setFormMessage({ text: 'Artigo guardado com sucesso!', type: 'success' });
          setTimeout(() => navigate('/admin/dashboard'), 1000);
      }

    } catch (error) { 
      console.error(error);
      setFormMessage({ text: error.response?.data?.message || 'Falha na comunicação com o servidor.', type: 'error' }); 
    }
  };

  // NOVA FUNÇÃO: Acionada quando o admin clica em "Treinar Agora" no Modal
  const handleTrainAI = async () => {
      setIsTrainingInProgress(true);
      try {
          await api.post('/ai/train');
          setFormMessage({ text: 'Artigo guardado e Inteligência Artificial treinada com sucesso!', type: 'success' });
          setTimeout(() => navigate('/admin/dashboard'), 1500);
      } catch (err) {
          alert('Artigo salvo, mas ocorreu uma falha ao treinar a IA. Você pode treinar manualmente depois.');
          navigate('/admin/dashboard');
      } finally {
          setIsTrainingInProgress(false);
          setIsTrainingModalOpen(false);
      }
  };

  // NOVA FUNÇÃO: Acionada quando o admin clica em "Mais tarde" no Modal
  const handleSkipTrain = () => {
      setFormMessage({ text: 'Artigo guardado com sucesso!', type: 'success' });
      navigate('/admin/dashboard');
  };

  const renderCategoryCheckboxes = (cats, parentId = null, level = 0) => {
    return cats.filter(c => c.parent_id === parentId).map(cat => (
      <React.Fragment key={cat.id}>
        <div className="category-checkbox-item" style={{ paddingLeft: `calc(${level * 1.5}rem)` }}>
          <label>
            <input type="checkbox" checked={selectedCategories.includes(cat.id)} onChange={() => handleCategoryToggle(cat.id)} />
            {cat.name}
          </label>
        </div>
        {renderCategoryCheckboxes(cats, cat.id, level + 1)}
      </React.Fragment>
    ));
  };

  if (loading) return <div className="admin-main"><p>A carregar editor...</p></div>;

  return (
    <main className="admin-main">
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/admin/dashboard" className="nav-link" style={{ display: 'inline-flex' }}><ArrowLeft size={18} /> Voltar aos Artigos</Link>
        {lastSaved && <span className="draft-info"><Clock size={14} /> Rascunho guardado às {lastSaved.toLocaleTimeString()}</span>}
      </div>

      {hasDraft && (
        <div style={{ backgroundColor: '#e0f2fe', border: '1px solid #bae6fd', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#0369a1' }}>
          <span>Encontrámos um rascunho local não guardado no servidor ({new Date(hasDraft).toLocaleString()}).</span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={restoreDraft} className="btn-primary" style={{ padding: '0.4rem 0.8rem' }}><RefreshCw size={14}/> Restaurar</button>
            <button onClick={discardDraft} className="btn-danger-outline" style={{ padding: '0.4rem 0.8rem' }}><Trash2 size={14}/> Descartar</button>
          </div>
        </div>
      )}

      <div className="editor-page-container">
        <aside className="editor-side-panel">
          
          <div className="editor-side-card">
            <h4><Settings size={18} /> Publicação</h4>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="status" style={{ fontSize: '0.85rem' }}>Visibilidade:</label>
              <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: '100%' }}>
                <option value="draft">Rascunho (Oculto)</option>
                <option value="published_internal_private">Interno Privado (Só Editores/Admins)</option>
                <option value="published_internal">Interno (Acesso com Login)</option>
                <option value="published_public">Público (Visível a todos)</option>
              </select>
            </div>
          </div>

          <div className="editor-side-card">
            <h4><Tags size={18} /> Categorias</h4>
            <div className="category-selector" style={{ border: 'none', padding: 0, maxHeight: '300px', backgroundColor: 'transparent' }}>
              {categories.length === 0 ? <span style={{color: '#888', fontSize: '0.9rem'}}>Nenhuma categoria.</span> : renderCategoryCheckboxes(categories)}
            </div>
          </div>

          {formMessage.text && (
            <div className={`feedback-message ${formMessage.type}`} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: 0 }}>
              {formMessage.type === 'error' && <AlertCircle size={16} />}
              {formMessage.text}
            </div>
          )}

          <button onClick={handleSave} className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}>
            <Save size={20} /> Salvar e Publicar
          </button>
        </aside>

        <div className="editor-main-area">
          <input type="text" className="title-input-invisible" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Escreva um título memorável..." autoFocus />
          <div style={{ marginTop: '1rem' }}>
            <ToastEditor 
               ref={editorRef} 
               initialValue={initialMarkdown || "Comece a escrever o seu artigo aqui..."} 
               previewStyle="vertical" 
               height="650px" 
               initialEditType="wysiwyg" 
               useCommandShortcut={true} 
               hooks={{ addImageBlobHook: onUploadImage }} 
               language="pt-BR" 
               theme={isDark ? 'dark' : 'light'} 
            />
          </div>
        </div>
      </div>

      {/* MODAL DE TREINAMENTO DA IA */}
      <ConfirmModal 
        isOpen={isTrainingModalOpen} 
        onClose={isTrainingInProgress ? () => {} : handleSkipTrain}
        onConfirm={handleTrainAI}
        title="Atualizar Motor de Inteligência Artificial?"
        message={
          isTrainingInProgress 
          ? "A IA está a compilar e memorizar a nova base de conhecimento. Por favor aguarde..." 
          : "Você acabou de guardar um artigo público! Deseja compilar a base de dados agora para que o Chatbot consiga responder dúvidas sobre este conteúdo?"
        }
        confirmText={isTrainingInProgress ? "A Treinar (Aguarde)..." : "Sim, Atualizar IA"}
        cancelText="Mais tarde"
        isDanger={false}
      />

    </main>
  );
}