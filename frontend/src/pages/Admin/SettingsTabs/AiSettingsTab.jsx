// frontend/src/pages/Admin/SettingsTabs/AiSettingsTab.jsx
import { useState, useEffect } from 'react';
import { Bot, Save, Zap, CheckCircle, AlertCircle, Cloud, Server } from 'lucide-react';
import api from '../../../services/api';

export default function AiSettingsTab() {
  const [aiActive, setAiActive] = useState(false);
  const [aiProvider, setAiProvider] = useState('gemini'); // NOVO ESTADO
  const [apiKey, setApiKey] = useState('');
  const [maskedKey, setMaskedKey] = useState('');
  const [lastSync, setLastSync] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [training, setTraining] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchSettings = async () => {
    try {
      const res = await api.get('/ai/settings');
      setAiActive(res.data.ai_active);
      setAiProvider(res.data.ai_provider || 'gemini');
      setMaskedKey(res.data.masked_key);
      setLastSync(res.data.last_sync);
      setLoading(false);
    } catch (err) {
      setMessage({ text: 'Erro ao carregar configurações.', type: 'error' });
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });
    
    try {
      const payload = { ai_active: aiActive, gemini_api_key: apiKey, ai_provider: aiProvider };
      await api.post('/ai/settings', payload);
      setMessage({ text: 'Configurações guardadas com sucesso!', type: 'success' });
      setApiKey(''); 
      fetchSettings(); 
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Erro ao guardar.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleTrain = async () => {
    setTraining(true);
    setMessage({ text: '', type: '' });
    
    try {
      const res = await api.post('/ai/train');
      setMessage({ text: `${res.data.message} ${res.data.details}`, type: 'success' });
      fetchSettings(); 
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Falha no treinamento.', type: 'error' });
    } finally {
      setTraining(false);
    }
  };

  if (loading) return <p>A carregar configurações de IA...</p>;

  return (
    <div className="config-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem' }}>
        <Bot size={28} color="#007bff" />
        <h3 style={{ margin: 0, border: 'none', padding: 0 }}>Motor de IA (Assistente Virtual)</h3>
      </div>

      <form onSubmit={handleSave}>
        
        {/* LIGA / DESLIGA */}
        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '15px', backgroundColor: '#f9fafb', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
          <label className="theme-switch" htmlFor="aiToggle" style={{ margin: 0 }}>
            <input type="checkbox" id="aiToggle" checked={aiActive} onChange={(e) => setAiActive(e.target.checked)} />
            <span className="slider round"></span>
          </label>
          <div>
            <strong style={{ display: 'block' }}>Chatbot Ativo</strong>
            <small style={{ color: '#6b7280', marginTop: '2px' }}>Apresenta o assistente flutuante na Central de Ajuda deste setor.</small>
          </div>
        </div>

        {/* ESCOLHA DO PROVEDOR */}
        <div className="form-group">
          <label>Selecione o Provedor de Inteligência Artificial:</label>
          <div style={{ display: 'flex', gap: '15px', marginTop: '8px' }}>
            
            <label style={{ flex: 1, padding: '15px', border: aiProvider === 'gemini' ? '2px solid #007bff' : '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', backgroundColor: aiProvider === 'gemini' ? '#eff6ff' : 'transparent', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="radio" name="ai_provider" value="gemini" checked={aiProvider === 'gemini'} onChange={(e) => setAiProvider(e.target.value)} style={{ display: 'none' }} />
              <Cloud size={24} color={aiProvider === 'gemini' ? '#007bff' : '#6b7280'} />
              <div>
                <strong>Google Gemini</strong><br/>
                <small>Rápido. Requer API Key (Acesso à internet).</small>
              </div>
            </label>

            <label style={{ flex: 1, padding: '15px', border: aiProvider === 'ollama' ? '2px solid #007bff' : '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', backgroundColor: aiProvider === 'ollama' ? '#eff6ff' : 'transparent', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="radio" name="ai_provider" value="ollama" checked={aiProvider === 'ollama'} onChange={(e) => setAiProvider(e.target.value)} style={{ display: 'none' }} />
              <Server size={24} color={aiProvider === 'ollama' ? '#007bff' : '#6b7280'} />
              <div>
                <strong>Ollama Local (Gemma 3)</strong><br/>
                <small>Privado, grátis. Roda na nossa infraestrutura interna.</small>
              </div>
            </label>

          </div>
        </div>

        {/* CAMPO API KEY CONDICIONAL */}
        {aiProvider === 'gemini' && (
          <div className="form-group" style={{ marginTop: '1.5rem', animation: 'fadeIn 0.3s' }}>
            <label>Google Gemini API Key:</label>
            <input 
              type="password" 
              value={apiKey} 
              onChange={(e) => setApiKey(e.target.value)} 
              placeholder={maskedKey ? `Atual: ${maskedKey} (Digite para alterar)` : 'Cole a sua chave do AI Studio aqui...'} 
            />
          </div>
        )}

        {message.text && (
          <div className={`feedback-message ${message.type}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '1rem' }}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </div>
        )}

        <div style={{ display: 'flex', gap: '15px', marginTop: '2rem' }}>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} /> {saving ? 'A guardar...' : 'Guardar Configurações'}
          </button>

          <button type="button" onClick={handleTrain} className="btn-secondary" style={{ backgroundColor: '#10b981', color: 'white' }} disabled={training || (aiProvider === 'gemini' && !maskedKey && !apiKey)}>
            <Zap size={18} /> {training ? 'A treinar agente...' : 'Sincronizar e Treinar IA'}
          </button>
        </div>
      </form>

      {lastSync && (
        <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#6b7280' }}>
          Último treino/sincronização realizado em: {new Date(lastSync).toLocaleString('pt-PT')}
        </p>
      )}
    </div>
  );
}