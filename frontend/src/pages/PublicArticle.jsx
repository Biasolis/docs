// frontend/src/pages/PublicArticle.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Layout } from 'lucide-react';
import api from '../services/api';

export default function PublicArticle() {
  const { sectorSlug, articleSlug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        // Vamos criar esta rota no backend em seguida!
        const res = await api.get(`/articles/public/${sectorSlug}/${articleSlug}`);
        setArticle(res.data);
      } catch (err) {
        setError('Artigo não encontrado ou indisponível.');
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [sectorSlug, articleSlug]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>A carregar artigo...</div>;
  
  if (error || !article) return (
    <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
      <h2>Ocorreu um erro</h2>
      <p>{error}</p>
      <Link to="/" style={{ color: '#007bff', textDecoration: 'underline' }}>Voltar ao Início</Link>
    </div>
  );

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#6b7280', textDecoration: 'none', marginBottom: '2rem' }}>
        <ArrowLeft size={18} /> Voltar à Central de Ajuda
      </Link>

      <article className="public-article-container">
        <header style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', color: '#111827', marginBottom: '1rem', lineHeight: '1.2' }}>
            {article.title}
          </h1>
          <div style={{ display: 'flex', gap: '15px', color: '#6b7280', fontSize: '0.9rem' }}>
             <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Layout size={16} /> Setor: <strong style={{color: '#374151'}}>{sectorSlug.toUpperCase()}</strong>
             </span>
             <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Clock size={16} /> Atualizado em: {new Date(article.updated_at).toLocaleDateString('pt-PT')}
             </span>
          </div>
        </header>

        {/* Renderiza o Markdown em HTML (você pode precisar importar a sua folha de estilos de Markdown aqui se tiver uma) */}
        <div 
          className="markdown-content" 
          style={{ lineHeight: '1.8', fontSize: '1.1rem', color: '#374151' }}
          dangerouslySetInnerHTML={{ __html: article.html_content }} 
        />
      </article>
    </main>
  );
}