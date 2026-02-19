// frontend/src/pages/Admin/SettingsTabs/CategoriesTab.jsx
import React, { useState, useEffect } from 'react';
import { Edit, Trash2, PlusCircle, Save } from 'lucide-react';
import api from '../../../services/api';
import Modal from '../../../components/Modal';
import ConfirmModal from '../../../components/ConfirmModal';

const CategoryTreeNode = ({ category, level, onEdit, onDelete, allCategories }) => {
  const children = allCategories.filter(c => c.parent_id === category.id);
  return (
    <>
      {/* CORREÇÃO AQUI: calc() garante que a borda de 1.5rem seja sempre respeitada */}
      <li style={{ paddingLeft: `calc(1.5rem + ${level * 2}rem)` }}>
        <span style={{ fontWeight: level === 0 ? '600' : '400', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Adiciona um pequeno indicador visual para as subcategorias */}
          {level > 0 && <span style={{ color: '#9ca3af', fontSize: '0.9em' }}>└</span>}
          {category.name}
        </span>
        <div className="actions" style={{ display: 'flex', gap: '8px' }}>
          {/* Ajuste no tamanho dos botões para ficarem mais proporcionais */}
          <button onClick={() => onEdit(category)} className="btn-edit" style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }}>
            <Edit size={14}/> Editar
          </button>
          <button onClick={() => onDelete(category.id, category.name)} className="btn-danger-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }}>
            <Trash2 size={14}/> Apagar
          </button>
        </div>
      </li>
      {children.map(child => (
        <CategoryTreeNode key={child.id} category={child} level={level + 1} onEdit={onEdit} onDelete={onDelete} allCategories={allCategories} />
      ))}
    </>
  );
};

export default function CategoriesTab() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados do Modal Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [formMessage, setFormMessage] = useState({ text: '', type: '' });
  const isEditing = !!categoryId;

  // Estado Confirmação Delete
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null, name: '', hasChildren: false });

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) { alert('Erro ao carregar categorias.'); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, []);

  const openNewCategoryModal = () => {
    setCategoryId(''); setName(''); setParentId(''); setFormMessage({ text: '', type: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (category) => {
    setCategoryId(category.id); setName(category.name); setParentId(category.parent_id || '');
    setFormMessage({ text: '', type: '' });
    setIsModalOpen(true);
  };

  const isDescendant = (cats, childId, potentialParentId) => {
    const child = cats.find(c => c.id === childId);
    if (!child || !child.parent_id) return false;
    if (child.parent_id === potentialParentId) return true;
    return isDescendant(cats, child.parent_id, potentialParentId);
  };

  const renderParentOptions = (cats, currentParentId = null, indent = '') => {
    return cats.filter(c => c.parent_id === currentParentId).map(cat => {
        if (isEditing && (cat.id === categoryId || isDescendant(cats, cat.id, categoryId))) return null;
        return (
          <React.Fragment key={cat.id}>
             <option value={cat.id}>{indent}{cat.name}</option>
             {renderParentOptions(cats, cat.id, `${indent}-- `)}
          </React.Fragment>
        );
      });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormMessage({ text: '', type: '' });
    const payload = { name, parent_id: parentId ? parseInt(parentId) : null };
    try {
      if (isEditing) await api.put(`/categories/${categoryId}`, payload);
      else await api.post('/categories', payload);
      setIsModalOpen(false);
      fetchCategories();
    } catch (error) { setFormMessage({ text: error.response?.data?.message || 'Erro.', type: 'error' }); }
  };

  const requestDelete = (id, name) => {
    const hasChildren = categories.some(cat => cat.parent_id === id);
    setConfirmModal({ isOpen: true, id, name, hasChildren });
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/categories/${confirmModal.id}`);
      setConfirmModal({ isOpen: false, id: null, name: '', hasChildren: false });
      fetchCategories();
    } catch (error) { alert('Erro ao apagar.'); setConfirmModal({ isOpen: false, id: null, name: '', hasChildren: false }); }
  };

  const rootCategories = categories.filter(c => c.parent_id === null);

  return (
    <>
      <div className="section-header">
        <h3>Categorias da Documentação</h3>
        <button onClick={openNewCategoryModal} className="btn-primary">
          <PlusCircle size={18} /> Adicionar Categoria
        </button>
      </div>

      <div className="content-table" style={{ padding: '0.5rem 0' }}>
        <ul className="category-tree">
          {loading ? <li style={{paddingLeft: '1.5rem'}}>A carregar...</li> : rootCategories.length === 0 ? <li style={{paddingLeft: '1.5rem'}}>Nenhuma categoria registada.</li> : (
            rootCategories.map(cat => (
              <CategoryTreeNode key={cat.id} category={cat} level={0} onEdit={openEditModal} onDelete={requestDelete} allCategories={categories} />
            ))
          )}
        </ul>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Editar Categoria' : 'Nova Categoria'}>
        <form id="catForm" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome da Categoria:</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Categoria Pai (Opcional):</label>
            <select value={parentId} onChange={e => setParentId(e.target.value)}>
              <option value="">-- Nenhuma (Categoria Raiz) --</option>
              {renderParentOptions(categories)}
            </select>
          </div>
          {formMessage.text && <p className={`feedback-message ${formMessage.type}`}>{formMessage.text}</p>}
        </form>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" form="catForm" className="btn-primary"><Save size={16}/> {isEditing ? 'Atualizar' : 'Criar Categoria'}</button>
        </div>
      </Modal>

      <ConfirmModal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal({ isOpen: false, id: null, name: '', hasChildren: false })}
        onConfirm={confirmDelete}
        title="Apagar Categoria"
        message={`Tem a certeza que deseja apagar a categoria "${confirmModal.name}"?${confirmModal.hasChildren ? '\n\n⚠️ AVISO: Esta categoria possui subcategorias. Se a apagar, as subcategorias tornar-se-ão categorias principais (raiz).' : ''}`}
        confirmText="Sim, Apagar"
      />
    </>
  );
}