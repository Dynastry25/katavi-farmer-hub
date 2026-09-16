import React, { useEffect, useState, useRef } from 'react';
import { marketPricesAPI } from '../../api/client';
import './MarketTicker.css';

const formatTZS = (value) =>
  value == null
    ? '—'
    : `TZS ${Number(value).toLocaleString('sw-TZ', { maximumFractionDigits: 0 })}`;

const MarketTicker = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data } = await marketPricesAPI.getTicker();
        if (!cancelled) {
          setItems(Array.isArray(data) ? data : []);
          setError(false);
        }
      } catch (err) {
        console.error('Ticker load error:', err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    timerRef.current = setInterval(load, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (loading) {
    return <div className="market-ticker">
      <span className="ticker-label">⚡ Bei za Soko</span>
      <span className="ticker-loading">Inapakia bei za soko...</span>
    </div>;
  }

  if (error || items.length === 0) {
    return null;
  }

  const doubled = [...items, ...items];

  return (
    <div className="market-ticker" aria-label="Bei za soko katika muda halisi">
      <span className="ticker-label">⚡ Bei za Soko</span>
      <div className="ticker-track">
        <div className="ticker-scroll">
          {doubled.map((item, i) => {
            const change = Number(item.changePct) || 0;
            const cls = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
            const arrow = change > 0 ? '▲' : change < 0 ? '▼' : '▲';
            return (
              <span className="ticker-item" key={`${item._id}-${i}`}>
                <span className="ticker-crop">{item.cropName}</span>
                <span className="ticker-price">{formatTZS(item.currentPrice)}</span>
                <span className="ticker-prev">{formatTZS(item.previousPrice)}</span>
                <span className={`ticker-change ${cls}`}>
                  {arrow} {change > 0 ? '+' : ''}{change.toFixed(1)}%
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MarketTicker;