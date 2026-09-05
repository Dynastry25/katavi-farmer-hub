import React, { useEffect, useState } from 'react';
import { settingsAPI } from '../../api/client';

const PublicBanner = () => {
  const [banner, setBanner] = useState(null);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('kataviBannerDismissed') === '1');

  useEffect(() => {
    let mounted = true;
    settingsAPI.getPlatform()
      .then((res) => {
        if (!mounted) return;
        const { bannerActive, bannerMessage } = res.data || {};
        if (bannerActive && bannerMessage) setBanner(bannerMessage);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  if (!banner || dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem('kataviBannerDismissed', '1');
    setDismissed(true);
  };

  return (
    <div className="public-banner" role="status">
      <span className="public-banner-icon"><i className="fas fa-bullhorn"></i></span>
      <span className="public-banner-message">{banner}</span>
      <button className="public-banner-close" onClick={handleDismiss} aria-label="Funga" title="Funga">
        <i className="fas fa-times"></i>
      </button>
    </div>
  );
};

export default PublicBanner;