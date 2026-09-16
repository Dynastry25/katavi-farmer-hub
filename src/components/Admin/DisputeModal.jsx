import React, { useState } from 'react';
import { ordersAPI } from '../../api/client';
import './DisputeModal.css';

const REASONS = [
  { value: 'quality', label: 'Ubora wa bidhaa / mazao', icon: 'fas fa-circle-exclamation' },
  { value: 'quantity', label: 'Kiasi kisicho sawa', icon: 'fas fa-scale-unbalanced' },
  { value: 'delivery', label: 'Uwasilishaji / muda uliochelewa', icon: 'fas fa-truck' },
  { value: 'payment', label: 'Tatizo la malipo', icon: 'fas fa-money-bill-wave' },
  { value: 'communication', label: 'Mawasiliano mabaya', icon: 'fas fa-comments' },
  { value: 'other', label: 'Lingine (eleza hapa chini)', icon: 'fas fa-ellipsis' },
];

const DisputeModal = ({ order, orderId, orderLabel, onClose, onSubmitted }) => {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!reason) {
      setError('Chagua sababu ya mgogoro');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await ordersAPI.dispute(orderId, {
        reason: REASONS.find(r => r.value === reason)?.label || reason,
        description: description.trim(),
      });
      onSubmitted();
    } catch (err) {
      setError(err.response?.data?.message || 'Hitilafu imetokea wakati wa kufungua mgogoro');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dispute-modal-overlay" onClick={onClose}>
      <div className="dispute-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dispute-modal-header">
          <h3><i className="fas fa-gavel"></i> Fungua Mgogoro</h3>
          <button className="dispute-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="dispute-modal-body">
          <p className="dispute-order-info">
            Agizo: <strong>{orderLabel}</strong> — {order?.status || ''}
          </p>

          <div className="dispute-reasons">
            {REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                className={`dispute-reason ${reason === r.value ? 'active' : ''}`}
                onClick={() => setReason(r.value)}
              >
                <i className={r.icon}></i>
                {r.label}
              </button>
            ))}
          </div>

          <textarea
            className="dispute-description"
            placeholder="Eleza mgogoro kwa undani (hiari)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          ></textarea>

          {error && <div className="dispute-error">{error}</div>}
        </div>
        <div className="dispute-modal-footer">
          <button className="btn btn-sm btn-outline" onClick={onClose} disabled={submitting}>Ghairi</button>
          <button className="btn btn-sm btn-danger" onClick={submit} disabled={submitting}>
            {submitting ? (
              <><i className="fas fa-spinner fa-spin"></i> Inatuma...</>
            ) : (
              <><i className="fas fa-gavel"></i> Fungua Mgogoro</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisputeModal;