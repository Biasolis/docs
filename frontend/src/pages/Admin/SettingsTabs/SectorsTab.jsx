// frontend/src/pages/Admin/SettingsTabs/SectorsTab.jsx
import React, { useState, useEffect } from 'react';
import { Edit, Trash2, PlusCircle, Save } from 'lucide-react';
import api from '../../../services/api';
import Modal from '../../../components/Modal';
import ConfirmModal from '../../../components/ConfirmModal';

export default function SectorsTab() {
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sectorId, setSectorId] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [formMessage, setFormMessage] = useState({ text: '', type: '' });
  const isEditing = !!sectorId;

  // Confirmação Apagar
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null, name: '' });

  const fetchSectors = async () => {
    try {
      const res = await api.get('/sectors');
      setSectors(res.data);
    } catch (err) { alert('Erro ao carregar setores.'); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSectors(); }, []);

  const openNewModal = () => {
    setSectorId(''); setName(''); setSlug(''); setDescription(''); setFormMessage({ text: '', type: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (s) => {
    setSectorId(s.id); setName(s.name); setSlug(s.slug); setDescription(s.description || '');
    setFormMessage({ text: '', type: '' });
    setIsModalOpen(true);
  };

  // Preenche o slug automaticamente
  const handleNameChange = (e) => {
    const newName = e.target.value;
    setName(newName);
    if (!isEditing) {
      setSlug(newName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormMessage({ text: '', type: '' });
    const payload = { name, slug, description };
    try {
      if (isEditing) await api.put(`/sectors/${sectorId}`, payload);
      else await api.post('/sectors', payload);
      setIsModalOpen(false);
      fetchSectors();
    } catch (error) { setFormMessage({ text: error.response?.data?.message || 'Erro.', type: 'error' }); }
  };

  const requestDelete = (id, name) => setConfirmModal({ isOpen: true, id, name });

  const confirmDelete = async () => {
    try {
      await api.delete(`/sectors/${confirmModal.id}`);
      setConfirmModal({ isOpen: false, id: null, name: '' });
      fetchSectors();
    } catch (error) { alert(error.response?.data?.message || 'Erro ao apagar.'); setConfirmModal({ isOpen: false, id: null, name: '' }); }
  };

  return (
    <>
      <div className="section-header">
        <h3>Gestão de Setores (Global)</h3>
        <button onClick={openNewModal} className="btn-primary">
          <PlusCircle size={18} /> Adicionar Setor
        </button>
      </div>

      <div className="content-table">
        <table>
          <thead>
            <tr><th>ID</th><th>Nome do Setor</th><th>Slug (URL)</th><th>Descrição</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="5">A carregar...</td></tr> : 
             sectors.map(s => (
              <tr key={s.id}>
                <td>{s.id}</td><td><strong>{s.name}</strong></td><td><code>/central/{s.slug}</code></td><td>{s.description}</td>
                <td className="actions">
                  <button onClick={() => openEditModal(s)} className="btn-edit"><Edit size={14}/> Editar</button>
                  <button onClick={() => requestDelete(s.id, s.name)} className="btn-danger-outline"><Trash2 size={14}/> Apagar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Editar Setor' : 'Novo Setor'}>
        <form id="sectorForm" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome do Setor:</label>
            <input type="text" value={name} onChange={handleNameChange} required />
          </div>
          <div className="form-group">
            <label>Slug (Nome na URL):</label>
            <input type="text" value={slug} onChange={e => setSlug(e.target.value.toLowerCase())} required />
            <small>Apenas letras minúsculas, números e traços. Ex: recursos-humanos</small>
          </div>
          <div className="form-group">
            <label>Descrição (Opcional):</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontFamily: 'inherit' }} rows={3} />
          </div>
          {formMessage.text && <p className={`feedback-message ${formMessage.type}`}>{formMessage.text}</p>}
        </form>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" form="sectorForm" className="btn-primary"><Save size={16}/> {isEditing ? 'Atualizar' : 'Criar Setor'}</button>
        </div>
      </Modal>

      <ConfirmModal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal({ isOpen: false, id: null, name: '' })}
        onConfirm={confirmDelete}
        title="Apagar Setor"
        message={`Tem a certeza que deseja apagar o setor "${confirmModal.name}"?`}
        confirmText="Sim, Apagar"
      />
    </>
  );
}