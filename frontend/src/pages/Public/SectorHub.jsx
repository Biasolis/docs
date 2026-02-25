// frontend/src/pages/Public/SectorHub.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layers, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import useDarkMode from '../../hooks/useDarkMode';
import '../../assets/style.css';

export default function SectorHub() {
  const { isDark, toggleTheme } = useDarkMode();
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/sectors')
       .then(res => setSectors(res.data))
       .catch(err => console.error(err))
       .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <header>
        <div className="logo-container-public">
          <img alt="Logo" className="admin-logo" src="/images/logo.old.png" />
          <h1>Portal de Documentação</h1>
        </div>
        <div className="theme-switch-wrapper">
          <label className="theme-switch" htmlFor="darkModeToggle">
            <input type="checkbox" id="darkModeToggle" checked={isDark} onChange={toggleTheme} />
            <span className="slider round"></span>
          </label>
        </div>
      </header>

      <main className="hub-container">
        <div className="hub-header">
          <h2>Bem-vindo à Central de Ajuda</h2>
          <p>Selecione o setor abaixo para aceder aos artigos, processos e tutoriais correspondentes.</p>
        </div>

        {loading ? <p>A carregar setores...</p> : (
          <div className="sector-grid">
            {sectors.map(sector => (
              <Link to={`/central/${sector.slug}`} key={sector.id} className="sector-card">
                <div className="sector-icon-wrapper">
                  <Layers size={32} />
                </div>
                <h3>{sector.name}</h3>
                <p>{sector.description || 'Acesse a base de conhecimento e tutoriais deste setor.'}</p>
                <span className="sector-link-text">Aceder à Central <ArrowRight size={16}/></span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}