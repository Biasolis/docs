// frontend/src/pages/Admin/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import '../../assets/admin.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      
      const { token, user } = response.data;
      
      // Guarda os dados no contexto (que por sua vez guarda no localStorage)
      login(user, token);
      
      // Redireciona de imediato para o dashboard seguro
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao tentar iniciar sessão. Verifique as suas credenciais.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-logo-container">
        {/* Como a pasta do backend está a servir as imagens em desenvolvimento, isto vai funcionar perfeitamente */}
        <img alt="Logo" className="admin-logo" src="/images/logo.old.png" style={{ height: '45px', width: 'auto' }} />
      </div>

      <h2>Login - Central de Documentação</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input 
            type="email" 
            id="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
            disabled={isSubmitting}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Senha:</label>
          <input 
            type="password" 
            id="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
            disabled={isSubmitting}
          />
        </div>
        
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'A entrar...' : (
            <>
              <LogIn size={18} /> Entrar
            </>
          )}
        </button>
        
        {error && <p className="error-message">{error}</p>}
      </form>
    </div>
  );
}