// frontend/src/pages/Admin/SettingsTabs/ProfileTab.jsx
import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';

export default function ProfileTab() {
  const { user, login, token } = useAuth();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (user) setUsername(user.username);
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    if (password && password !== confirmPassword) {
      setMessage({ text: 'As senhas não coincidem.', type: 'error' });
      return;
    }

    const payload = { username };
    if (password) payload.password = password;

    try {
      const response = await api.put('/users/me', payload);
      setMessage({ text: 'Perfil atualizado com sucesso!', type: 'success' });
      login(response.data.user, token);
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage({ text: error.response?.data?.message || 'Erro ao atualizar perfil.', type: 'error' });
    }
  };

  return (
    <div className="config-card" style={{ maxWidth: '600px' }}>
      <h3>Os Meus Dados</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email (Login)</label>
          <input type="email" id="email" value={user?.email || ''} disabled />
          <small>O e-mail de acesso não pode ser alterado.</small>
        </div>
        <div className="form-group">
          <label htmlFor="username">Nome de Exibição:</label>
          <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <hr style={{ border: 0, borderTop: '1px solid #e5e7eb', margin: '2rem 0' }} />
        <h4 style={{ marginBottom: '1rem', color: '#4b5563' }}>Alterar Senha</h4>
        <div className="form-group">
          <label htmlFor="password">Nova Senha:</label>
          <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Deixe em branco para não alterar" />
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirmar Nova Senha:</label>
          <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </div>
        <div className="form-actions" style={{ marginTop: '2rem' }}>
          <button type="submit" className="btn-primary"><Save size={18} /> Guardar Alterações</button>
        </div>
        {message.text && <p className={`feedback-message ${message.type}`}>{message.text}</p>}
      </form>
    </div>
  );
}