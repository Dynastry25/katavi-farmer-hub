import React, { useState, useEffect, useRef } from 'react';
import './NewsCard.css';

const fallbackImages = {
  news: 'https://via.placeholder.com/400x250/4f46e5/ffffff?text=USCF+News',
  event: 'https://via.placeholder.com/400x250/10b981/ffffff?text=USCF+Event',
  default: 'https://via.placeholder.com/400x250/6b7280/ffffff?text=USCF+TAKWIMU'
};

const NewsCard = ({ news }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [currentViews, setCurrentViews] = useState(news.views || 0);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const cardRef = useRef(null);

  const API_URL = 'https://uscftakwimu-11.onrender.com/api';

  // Function to track view
  const trackView = async () => {
    if (!news._id || hasTrackedView) return;

    try {
      console.log(`👀 Tracking view for: ${news.title}`);
      
      const response = await fetch(`${API_URL}/news/${news._id}/view`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentViews(data.views);
        setHasTrackedView(true);
        console.log(`✅ View tracked for: "${news.title}" - ${data.views} views`);
        
        // Store in session storage to prevent duplicate tracking
        const trackedNews = JSON.parse(sessionStorage.getItem('trackedNews') || '{}');
        trackedNews[news._id] = true;
        sessionStorage.setItem('trackedNews', JSON.stringify(trackedNews));
      }
    } catch (error) {
      console.error('❌ Error tracking view:', error);
    }
  };

  // Check if already tracked in this session
  useEffect(() => {
    if (news._id) {
      const trackedNews = JSON.parse(sessionStorage.getItem('trackedNews') || '{}');
      if (trackedNews[news._id]) {
        setHasTrackedView(true);
      }
    }
  }, [news._id]);

  // Track view when card becomes visible
  useEffect(() => {
    if (!news._id || hasTrackedView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedView) {
            // Track view after 2 seconds of being visible
            const timer = setTimeout(() => {
              trackView();
            }, 2000);

            return () => clearTimeout(timer);
          }
        });
      },
      { 
        threshold: 0.6, // 60% visible
        rootMargin: '0px 0px -50px 0px'
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, [news._id, hasTrackedView]);

  // Track view on click/interaction
  const handleCardInteraction = () => {
    if (!hasTrackedView) {
      trackView();
    }
  };

  const toggleExpand = () => {
    handleCardInteraction();
    setIsExpanded(!isExpanded);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    console.log('✅ NewsCard image loaded:', currentImageUrl);
  };

  const handleImageError = () => {
    console.error('❌ NewsCard image failed to load:', currentImageUrl);
    setImageError(true);
    setImageLoaded(true);
    
    if (currentImageUrl !== getFallbackImage()) {
      setCurrentImageUrl(getFallbackImage());
      setImageError(false);
      setImageLoaded(false);
    }
  };

  const getExcerpt = (text, maxLength = 150) => {
    if (!text) return 'Hakuna maelezo...';
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Hakuna tarehe';
    try {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateString).toLocaleDateString('sw-TZ', options);
    } catch (error) {
      return 'Tarehe batili';
    }
  };

  const getImageUrl = (imageFilename) => {
    if (!imageFilename) {
      return getFallbackImage();
    }
    
    if (imageFilename.startsWith('http')) {
      return imageFilename;
    }
    
    return `https://uscftakwimu-11.onrender.com/api/images/${imageFilename}`;
  };

  const getFallbackImage = () => {
    if (news.category === 'events') {
      return fallbackImages.event;
    }
    return fallbackImages.news;
  };

  const getReadTime = () => {
    const content = news.content || news.excerpt || '';
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute) || 1;
  };

  const getCategoryDisplayName = (category) => {
    const categoryMap = {
      'events': 'Matukio',
      'missions': 'Misheni',
      'graduation': 'Mahafali',
      'prayer': 'Maombi',
      'announcements': 'Matangazo',
      'general': 'Habari'
    };
    return categoryMap[category] || 'Habari';
  };

  // Initialize component
  useEffect(() => {
    const imageUrl = news.imageUrl || getImageUrl(news.image);
    setCurrentImageUrl(imageUrl);
    setImageLoaded(false);
    setImageError(false);
    setCurrentViews(news.views || 0);
  }, [news]);

  return (
    <div 
      className="news-card" 
      ref={cardRef}
      onClick={handleCardInteraction}
      style={{ cursor: 'pointer' }}
    >
      <div className="news-image-container">
        <div 
          className="image-placeholder" 
          style={{ 
            display: imageLoaded ? 'none' : 'flex',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          }}
        >
          <i className="ri-image-line"></i>
          <span>Inapakia picha...</span>
        </div>
        {!imageError ? (
          <img 
            src={currentImageUrl}
            alt={news.title}
            className={`news-image ${imageLoaded ? 'loaded' : ''}`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div 
            className="image-error"
            style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white'
            }}
          >
            <i className="ri-image-line"></i>
            <span>Picha haipatikani</span>
          </div>
        )}
        <div className="news-overlay">
          <div className="news-badge">{getCategoryDisplayName(news.category)}</div>
          <div className="news-date">{formatDate(news.publishDate || news.createdAt)}</div>
        </div>
        <button className="news-share-btn" onClick={(e) => {
          e.stopPropagation();
          handleCardInteraction();
          // Add share functionality here
        }}>
          <i className="ri-share-line"></i>
        </button>
      </div>
      
      <div className="news-content">
        <h3 className="news-title">{news.title || 'Habari bila kichwa'}</h3>
        
        <div className="news-meta">
          <span className="news-category-tag">{getCategoryDisplayName(news.category)}</span>
          <span className="news-read-time">
            <i className="ri-time-line"></i>
            {getReadTime()} dakika
          </span>
          <span className="news-views">
            <i className="ri-eye-line"></i>
            {currentViews} {currentViews === 1 ? 'View' : 'Views'}
          </span>
        </div>
        
        <div className={`news-excerpt ${isExpanded ? 'expanded' : ''}`}>
          {isExpanded ? (news.excerpt || news.content || 'Hakuna maelezo...') : getExcerpt(news.excerpt || news.content)}
        </div>
        
        {(news.excerpt && news.excerpt.length > 150) || (news.content && news.content.length > 150) ? (
          <button 
            className="read-more-btn"
            onClick={toggleExpand}
          >
            {isExpanded ? (
              <>
                <i className="ri-arrow-up-s-line"></i>
                Ficha
              </>
            ) : (
              <>
                <i className="ri-arrow-down-s-line"></i>
                Soma Zaidi
              </>
            )}
          </button>
        ) : null}
        
        <div className="news-actions">
          <div className="news-author">
            <i className="ri-user-line"></i>
            {news.author || 'USCF CCT TAKWIMU'}
          </div>
          <div className="action-buttons">
            <button className="news-bookmark" onClick={(e) => {
              e.stopPropagation();
              handleCardInteraction();
            }}>
              <i className="ri-bookmark-line"></i>
            </button>
            <button className="news-share" onClick={(e) => {
              e.stopPropagation();
              handleCardInteraction();
            }}>
              <i className="ri-share-line"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsCard;