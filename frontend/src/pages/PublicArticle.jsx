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
        const res = await api.get(`/articles/public/${sectorSlug}/${articleSlug}`);
        setArticle(res.data);
      } catch (err) {
        // Captura o erro "Restrito" enviado pelo Backend
        setError(err.response?.data?.message || 'Artigo não encontrado ou indisponível.');
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
      <p style={{ fontSize: '1.2rem', color: '#ef4444', margin: '1rem 0' }}>{error}</p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
        <Link to="/" style={{ color: '#007bff', textDecoration: 'none', padding: '10px 20px', border: '1px solid #007bff', borderRadius: '8px' }}>Voltar ao Início</Link>
        <Link to="/admin/login" style={{ backgroundColor: '#007bff', color: '#fff', textDecoration: 'none', padding: '10px 20px', borderRadius: '8px' }}>Fazer Login</Link>
      </div>
    </div>
  );

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#6b7280', textDecoration: 'none', marginBottom: '2rem' }}>
        <ArrowLeft size={18} /> Voltar à Central de Ajuda
      </Link>

      {/* Alerta Visual se for um artigo Restrito/Rascunho */}
      {article.status !== 'published_public' && (
        <div style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '10px 15px', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <strong>Aviso:</strong> Está a pré-visualizar um documento restrito (Status: {article.status}).
        </div>
      )}

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

        <div 
          className="markdown-content" 
          style={{ lineHeight: '1.8', fontSize: '1.1rem', color: '#374151' }}
          dangerouslySetInnerHTML={{ __html: article.html_content }} 
        />
      </article>
    </main>
  );
}