// frontend/src/components/ConfirmModal.jsx
import { AlertTriangle, Info } from 'lucide-react';

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirmar", 
  cancelText = "Cancelar", 
  isDanger = true 
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: '0' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isDanger ? '#ef4444' : '#007bff' }}>
            {isDanger ? <AlertTriangle size={24} /> : <Info size={24} />}
            {title}
          </h3>
        </div>
        <div className="modal-body" style={{ padding: '1rem 1.5rem', color: 'var(--text-color)' }}>
          <p style={{ whiteSpace: 'pre-line', margin: 0 }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">{cancelText}</button>
          <button onClick={onConfirm} className={isDanger ? "btn-danger" : "btn-primary"}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}