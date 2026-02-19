// frontend/src/pages/Admin/SettingsTabs/AiSettingsTab.jsx
import { useState, useEffect } from 'react';
import { Bot, Save, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../../services/api';

export default function AiSettingsTab() {
  const [aiActive, setAiActive] = useState(false);
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
      const payload = { ai_active: aiActive, gemini_api_key: apiKey };
      await api.post('/ai/settings', payload);
      setMessage({ text: 'Configurações guardadas com sucesso!', type: 'success' });
      setApiKey(''); // Limpa o input após guardar
      fetchSettings(); // Recarrega para mostrar a nova máscara
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
      fetchSettings(); // Atualiza a data de sincronização
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Falha no treinamento da IA.', type: 'error' });
    } finally {
      setTraining(false);
    }
  };

  if (loading) return <p>A carregar configurações de IA...</p>;

  return (
    <div className="config-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem' }}>
        <Bot size={28} color="#007bff" />
        <h3 style={{ margin: 0, border: 'none', padding: 0 }}>Assistente Virtual (Gemini AI)</h3>
      </div>

      <form onSubmit={handleSave}>
        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '15px', backgroundColor: '#f9fafb', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <label className="theme-switch" htmlFor="aiToggle" style={{ margin: 0 }}>
            <input type="checkbox" id="aiToggle" checked={aiActive} onChange={(e) => setAiActive(e.target.checked)} />
            <span className="slider round"></span>
          </label>
          <div>
            <strong style={{ display: 'block' }}>Ativar Assistente de IA</strong>
            <small style={{ color: '#6b7280', marginTop: '2px' }}>Apresenta o botão flutuante de chat na Central de Ajuda do seu setor.</small>
          </div>
        </div>

        <div className="form-group" style={{ marginTop: '1.5rem' }}>
          <label>Google Gemini API Key:</label>
          <input 
            type="password" 
            value={apiKey} 
            onChange={(e) => setApiKey(e.target.value)} 
            placeholder={maskedKey ? `Atual: ${maskedKey} (Digite para alterar)` : 'Cole a sua chave do AI Studio aqui...'} 
          />
          <small>Obtenha a sua chave gratuita em <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer">Google AI Studio</a>.</small>
        </div>

        {message.text && (
          <div className={`feedback-message ${message.type}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </div>
        )}

        <div style={{ display: 'flex', gap: '15px', marginTop: '2rem' }}>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} /> {saving ? 'A guardar...' : 'Guardar Configurações'}
          </button>

          <button type="button" onClick={handleTrain} className="btn-secondary" style={{ backgroundColor: '#10b981', color: 'white' }} disabled={training || !maskedKey}>
            <Zap size={18} /> {training ? 'A treinar agente...' : 'Treinar Base de Conhecimento'}
          </button>
        </div>
      </form>

      {lastSync && (
        <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#6b7280' }}>
          Último treino realizado em: {new Date(lastSync).toLocaleString('pt-PT')}
        </p>
      )}
    </div>
  );
}