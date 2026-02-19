// frontend/src/pages/Admin/SettingsTabs/UsersTab.jsx
import { useState, useEffect } from 'react';
import { Edit, Trash2, Save, X } from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import Modal from '../../../components/Modal';
import ConfirmModal from '../../../components/ConfirmModal';

export default function UsersTab() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  
  const [users, setUsers] = useState([]);
  const [sectors, setSectors] = useState([]); // Guarda os setores para o Super Admin
  const [loading, setLoading] = useState(true);

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [sectorId, setSectorId] = useState(''); // Estado para o setor do utilizador editado
  
  const [formMessage, setFormMessage] = useState({ text: '', type: '' });
  const isEditing = !!userId;

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null, name: '' });

  // Busca utilizadores E setores (se for super admin) na montagem
  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, sectorsRes] = await Promise.all([
        api.get('/users'),
        isSuperAdmin ? api.get('/sectors') : Promise.resolve({ data: [] })
      ]);
      setUsers(usersRes.data);
      if (isSuperAdmin) setSectors(sectorsRes.data);
    } catch (error) {
      alert('Erro ao carregar dados dos utilizadores.');
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  const openNewUserModal = () => {
    setUserId(''); 
    setUsername(''); 
    setEmail(''); 
    setPassword(''); 
    setRole('user');
    setSectorId(user?.sector_id || ''); // Por padrão aponta para o setor de quem está logado
    setFormMessage({ text: '', type: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (u) => {
    setUserId(u.id); 
    setUsername(u.username); 
    setEmail(u.email); 
    setRole(u.role); 
    setPassword('');
    setSectorId(u.sector_id || ''); // Preenche o setor atual do utilizador
    setFormMessage({ text: '', type: '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormMessage({ text: '', type: '' });
    
    // Inclui o sector_id no envio (O backend só aceita isto se for super_admin)
    const userData = { username, email, role, password, sector_id: sectorId };
    if (isEditing && !password) delete userData.password;

    try {
      if (isEditing) {
        await api.put(`/users/${userId}`, userData);
      } else {
        await api.post('/users', userData);
      }
      setIsModalOpen(false);
      fetchData(); // Recarrega utilizadores
    } catch (error) {
      setFormMessage({ text: error.response?.data?.message || 'Erro ao guardar.', type: 'error' });
    }
  };

  const requestDelete = (id, name) => {
    setConfirmModal({ isOpen: true, id, name });
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/users/${confirmModal.id}`);
      setConfirmModal({ isOpen: false, id: null, name: '' });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Falha ao apagar.');
      setConfirmModal({ isOpen: false, id: null, name: '' });
    }
  };

  const getRoleName = (r) => {
    const roles = { 'user': 'Usuário', 'editor': 'Editor', 'admin': 'Admin', 'super_admin': 'Super Admin' };
    return roles[r] || r;
  };

  return (
    <>
      <div className="section-header">
        <h3>Gestão de Utilizadores</h3>
        <button onClick={openNewUserModal} className="btn-primary">
          Adicionar Utilizador
        </button>
      </div>

      <div className="content-table">
        <table>
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Email</th>
              <th>Setor</th>
              <th>Cargo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="5" style={{textAlign:'center'}}>A carregar...</td></tr> : 
             users.map(u => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>{u.sector_name || 'N/A'}</td>
                <td>{getRoleName(u.role)}</td>
                <td className="actions">
                  <button onClick={() => openEditModal(u)} className="btn-edit">Editar</button>
                  <button onClick={() => requestDelete(u.id, u.username)} disabled={u.id === user?.id} className="btn-danger-outline">Apagar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Editar Utilizador' : 'Novo Utilizador'}>
        <form id="userForm" onSubmit={handleSubmit}>
          
          <div className="form-group">
            <label>Nome de Exibição:</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          
          <div className="form-group">
            <label>Email (Login):</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          
          <div className="form-group">
            <label>Senha:</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={isEditing ? 'Deixe em branco para manter' : ''} required={!isEditing} />
          </div>
          
          {/* SE O LOGADO FOR SUPER ADMIN, MOSTRA O CAMPO DE SETOR */}
          {isSuperAdmin && (
            <div className="form-group">
              <label>Setor do Utilizador:</label>
              <select value={sectorId} onChange={e => setSectorId(e.target.value)} required>
                <option value="">-- Selecione o Setor --</option>
                {sectors.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Cargo / Permissão:</label>
            <select value={role} onChange={e => setRole(e.target.value)} required>
              <option value="user">Usuário (Lê artigos internos)</option>
              <option value="editor">Editor (Cria/Edita artigos)</option>
              <option value="admin">Administrador (Gere o setor)</option>
              {isSuperAdmin && <option value="super_admin">Super Admin (Acesso Global)</option>}
            </select>
          </div>
          
          {formMessage.text && <p className={`feedback-message ${formMessage.type}`}>{formMessage.text}</p>}
        </form>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" form="userForm" className="btn-primary">{isEditing ? 'Atualizar' : 'Criar Utilizador'}</button>
        </div>
      </Modal>

      <ConfirmModal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal({ isOpen: false, id: null, name: '' })}
        onConfirm={confirmDelete}
        title="Apagar Utilizador"
        message={`Tem a certeza que deseja apagar o utilizador "${confirmModal.name}"?`}
        confirmText="Sim, Apagar"
      />
    </>
  );
}