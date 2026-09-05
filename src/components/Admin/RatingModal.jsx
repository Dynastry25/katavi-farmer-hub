import React, { useState } from 'react';
import { ratingsAPI } from '../../api/client';
import './RatingModal.css';

const STAR_LABELS = ['', 'Mbaya', 'Hafifu', 'Inafaa', 'Nzuri', 'Bora'];

const RatingModal = ({ order, onClose, onSubmitted }) => {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (stars < 1) {
      setError('Chagua nyota kati ya 1 na 5');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await ratingsAPI.create({
        ratedOrder: order.id,
        rating: stars,
        comment,
      });
      onSubmitted(stars);
    } catch (err) {
      setError(err.response?.data?.message || 'Hitilafu imetokea');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rating-modal-overlay" onClick={onClose}>
      <div className="rating-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rating-modal-header">
          <h3>Toa Ukadiriaji</h3>
          <button className="rating-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="rating-modal-body">
          <p className="rating-order-info">
            Agizo: <strong>{order.crop || order.cropName || 'Bidhaa'}</strong> - {order.quantity || ''} kwa {order.price || ''}
          </p>

          <div className="star-input">
            {[1, 2, 3, 4, 5].map((n) => (
              <i
                key={n}
                className={`fas fa-star ${n <= (hover || stars) ? 'active' : ''}`}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setStars(n)}
              ></i>
            ))}
            <span className="star-label">{STAR_LABELS[hover || stars]}</span>
          </div>

          <textarea
            className="rating-comment"
            placeholder="Maoni yako (hiari)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          ></textarea>

          {error && <div className="rating-error">{error}</div>}
        </div>
        <div className="rating-modal-footer">
          <button className="btn btn-sm btn-outline" onClick={onClose} disabled={submitting}>Ghairi</button>
          <button className="btn btn-sm btn-primary" onClick={submit} disabled={submitting}>
            {submitting ? 'Inatuma...' : 'Tuma Ukadiriaji'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;