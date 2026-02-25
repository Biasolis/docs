// frontend/src/pages/Public/Home.jsx (COMPLETO E CORRIGIDO)
import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Search, ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Library, LayoutGrid } from 'lucide-react';
import api from '../../services/api';
import useDarkMode from '../../hooks/useDarkMode';
import '../../assets/style.css';
import Chatbot from '../../components/Chatbot';

const CategoryTreeNode = ({ category, level, activeCategoryId, onSelectCategory, categories }) => {
  const children = categories.filter(c => c.parent_id === category.id);
  const hasChildren = children.length > 0;
  const [isOpen, setIsOpen] = useState(level === 0);
  const isActive = activeCategoryId === category.id;

  return (
    <li key={category.id}>
      <a href={`#category-${category.id}`} className={`category-item level-${level} ${isActive ? 'active-category' : ''}`} style={{ paddingLeft: `${level * 1.2 + 0.5}rem` }} onClick={(e) => { e.preventDefault(); onSelectCategory(category.id); if (hasChildren) setIsOpen(!isOpen); }}>
        <span className="category-icon">{hasChildren ? (isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />) : <span style={{ width: '16px', display: 'inline-block' }}></span>}</span>
        <span className="category-icon" style={{ marginLeft: '-4px' }}>{hasChildren ? (isOpen ? <FolderOpen size={16} /> : <Folder size={16} />) : <FileText size={16} style={{ opacity: 0.6 }} />}</span>
        <span style={{ flex: 1 }}>{category.name}</span>
      </a>
      {hasChildren && isOpen && <ul className="category-sub-tree">{children.map(child => <CategoryTreeNode key={child.id} category={child} level={level + 1} activeCategoryId={activeCategoryId} onSelectCategory={onSelectCategory} categories={categories}/>)}</ul>}
    </li>
  );
};

export default function Home() {
  const { sectorSlug } = useParams();
  const { isDark, toggleTheme } = useDarkMode();
  const [aiSettings, setAiSettings] = useState({ active: false });
  
  const [sectorInfo, setSectorInfo] = useState({ name: 'Carregando...', slug: sectorSlug });
  const [categories, setCategories] = useState([]);
  const [articles, setArticles] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeArticle, setActiveArticle] = useState(null);
  const [articleLoading, setArticleLoading] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      // RESET TOTAL PARA CADA MUDANÇA DE SETOR
      setLoading(true);
      setError('');
      setCategories([]); 
      setArticles([]);
      setActiveArticle(null);

      try {
        const sectorsRes = await api.get('/sectors');
        const foundSector = sectorsRes.data.find(s => s.slug === sectorSlug);
        
        if(foundSector) {
            setSectorInfo(foundSector);
            // Captura status da IA vindo do backend
            setAiSettings({ active: foundSector.ai_active || false });

            // Busca paralela de categorias e artigos específicos do setor
            const [catData, artData] = await Promise.all([
                api.get(`/categories?sector=${sectorSlug}`),
                api.get(`/articles/public?sector=${sectorSlug}`)
            ]);
            
            setCategories(catData.data);
            setArticles(artData.data);
        } else {
            setError('Setor não encontrado.');
        }
      } catch (err) { 
        setError('Erro ao carregar os dados.'); 
      } finally { 
        setLoading(false); 
      }
    };

    fetchInitialData();
  }, [sectorSlug]);

  const fetchArticles = async (type = 'all', value = '') => {
    setLoading(true); setActiveArticle(null);
    try {
      let url = `/articles/public?sector=${sectorSlug}`;
      if (type === 'search') url = `/articles/search?q=${encodeURIComponent(value)}&sector=${sectorSlug}`;
      else if (type === 'category') url = `/articles/category/${value}?sector=${sectorSlug}`;
      const res = await api.get(url);
      setArticles(res.data);
    } catch (err) { setError('Erro ao procurar artigos.'); } 
    finally { setLoading(false); }
  };

  const handleSearch = (e) => {
    const val = e.target.value; setSearchTerm(val); setActiveCategoryId(null);
    if (val.trim() === '') fetchArticles('all');
    else setTimeout(() => fetchArticles('search', val), 300);
  };

  const handleSelectCategory = (categoryId) => {
    setSearchTerm(''); setActiveCategoryId(categoryId);
    fetchArticles(categoryId === null ? 'all' : 'category', categoryId);
  };

  const handleViewArticle = async (id) => {
    setArticleLoading(true);
    try {
      const res = await api.get(`/articles/public/${id}?sector=${sectorSlug}`);
      setActiveArticle(res.data);
      window.scrollTo({ top: 300, behavior: 'smooth' });
    } catch (err) { alert('Erro ao carregar o artigo.'); } 
    finally { setArticleLoading(false); }
  };

  const getIndexTitle = () => {
    if (searchTerm) return `Resultados para: "${searchTerm}"`;
    if (activeCategoryId !== null) {
      const cat = categories.find(c => c.id === activeCategoryId);
      return cat ? cat.name : 'Artigos';
    }
    return `Todos os Artigos (${sectorInfo.name})`;
  };

  const rootCategories = categories.filter(c => c.parent_id === null);

  return (
    <>
      <header>
        <div className="logo-container-public">
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
            <img alt="Logo" className="admin-logo" src="/images/logo.old.png" />
          </Link>
          <div style={{ borderLeft: '1px solid #e5e7eb', marginLeft: '15px', paddingLeft: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link to="/" style={{ color: '#6b7280' }}><LayoutGrid size={18} /></Link>
            <h1>Central de Ajuda: {sectorInfo.name}</h1>
          </div>
        </div>
        <div className="theme-switch-wrapper">
          <label className="theme-switch" htmlFor="darkModeToggle">
            <input type="checkbox" id="darkModeToggle" checked={isDark} onChange={toggleTheme} />
            <span className="slider round"></span>
          </label>
        </div>
      </header>

      <section className="hero-section">
        <h2>Como podemos ajudar com {sectorInfo.name}?</h2>
        <div className="hero-search-wrapper">
          <input type="search" placeholder="Pesquise por artigos..." value={searchTerm} onChange={handleSearch} />
          <Search className="hero-search-icon" size={22} />
        </div>
      </section>

      <div className="container">
        {categories.length > 0 && (
            <aside className="sidebar">
                <h3>Tópicos</h3>
                <nav>
                    <ul className="category-tree-public">
                    <li>
                        <a href="#all" className={`category-item level-0 ${activeCategoryId === null && !searchTerm ? 'active-category' : ''}`} onClick={(e) => { e.preventDefault(); handleSelectCategory(null); }} style={{ paddingLeft: '0.5rem', marginBottom: '1rem' }}>
                        <span className="category-icon"><Library size={18} /></span><span style={{ flex: 1 }}>Todos os Artigos</span>
                        </a>
                    </li>
                    {rootCategories.map(cat => <CategoryTreeNode key={cat.id} category={cat} level={0} activeCategoryId={activeCategoryId} onSelectCategory={handleSelectCategory} categories={categories}/>)}
                    </ul>
                </nav>
            </aside>
        )}

        <main className={`content ${categories.length === 0 ? 'full-width' : ''}`}>
          {error && <p style={{ color: '#ef4444' }}><strong>{error}</strong></p>}
          {loading && !articleLoading && <p style={{ color: '#6b7280' }}>A carregar...</p>}

          {!loading && activeArticle && (
            <section className="doc-section active">
              <button onClick={() => setActiveArticle(null)} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '25px', fontSize: '1rem', fontWeight: '500', padding: 0 }}>
                <ArrowLeft size={18} /> Voltar aos resultados
              </button>
              <h2>{activeArticle.title}</h2>
              <div dangerouslySetInnerHTML={{ __html: activeArticle.content_html }} />
            </section>
          )}

          {!loading && !activeArticle && (
            <>
              <h2 className="content-index-title">{getIndexTitle()}</h2>
              {articles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: '#6b7280' }}>
                  <FileText size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                  <p>Nenhum documento encontrado.</p>
                </div>
              ) : (
                <ul className="article-index-list">
                  {articles.map(article => (
                    <li key={article.id}>
                      <a href={`#artigo-${article.id}`} className="internal-link" onClick={(e) => { e.preventDefault(); handleViewArticle(article.id); }}>{article.title}</a>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </main>
      </div>

      {aiSettings.active && <Chatbot sectorSlug={sectorSlug} sectorName={sectorInfo.name} />}
    </>
  );
}