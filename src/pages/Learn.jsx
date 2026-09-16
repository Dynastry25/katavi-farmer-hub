import React, { useState, useEffect } from 'react';
import { videosAPI } from '../api/client';
import Loading from '../components/Loading/Loading';
import './CSS/Learn.css';

const CATEGORIES = [
  { value: 'all', label: 'Video Zote', icon: 'fas fa-th-large' },
  { value: 'farming', label: 'Mbinu za Kilimo', icon: 'fas fa-tractor' },
  { value: 'inputs', label: 'Matumizi ya Mbolea na Dawa', icon: 'fas fa-flask' },
  { value: 'harvest', label: 'Uvunaji na Uhifadhi', icon: 'fas fa-box' },
  { value: 'livestock', label: 'Ufugaji', icon: 'fas fa-horse' },
  { value: 'technology', label: 'Teknolojia', icon: 'fas fa-microchip' },
];

const Learn = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await videosAPI.getAll();
        if (res.data && res.data.length > 0) setVideos(res.data);
      } catch (err) {
        console.error('Fetch videos error:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  const fallbackVideos = [
    {
      _id: 'sample-1',
      title: 'Jinsi ya Kutengeneza Mbolea Asilia Nyumbani',
      duration: '8:15',
      views: '2,450',
      category: 'farming',
      description: 'Jifunze jinsi ya kutengeneza mbolea asilia kwa gharama ndogo kutoka kwenye mabaki ya mimea na taka za wanyama.',
      url: '',
    },
    {
      _id: 'sample-2',
      title: 'Udhibiti wa Wadudu bila Kemikali',
      duration: '6:30',
      views: '1,890',
      category: 'farming',
      description: 'Njia za asili za kudhibiti wadudu kwenye mimea yako bila kuharibu mazingira.',
      url: '',
    },
    {
      _id: 'sample-3',
      title: 'Uvunaji na Uhifadhi wa Mazao',
      duration: '10:20',
      views: '3,120',
      category: 'harvest',
      description: 'Mbinu bora za kuvuna na kuhifadhi mazao kwa muda mrefu ili kupunguza hasara.',
      url: '',
    },
    {
      _id: 'sample-4',
      title: 'Matumizi Sahihi ya Mbolea ya Kemikali',
      duration: '7:45',
      views: '1,450',
      category: 'inputs',
      description: 'Jifunze jinsi ya kupima na kutumia mbolea kwa usahihi ili kuongeza mazao.',
      url: '',
    },
  ];

  const allVideos = videos.length > 0 ? videos : fallbackVideos;

  const filteredVideos = allVideos.filter(video => {
    const matchCat = activeCategory === 'all' || video.category === activeCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch = !q || video.title.toLowerCase().includes(q) || (video.description || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const getTag = (category) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat ? cat.icon : 'fas fa-video';
  };

  const openPlayer = (video) => {
    setSelectedVideo(video);
    setPlaying(false);
  };

  if (loading) return <Loading message="Inapakia video za mafunzo..." />;

  return (
    <div className="page learn-page">
      <div className="learn-container">
        <div className="container">
          <div className="learn-header">
            <h1>Video za Mafunzo</h1>
            <p>Jifunze mbinu bora za kilimo kupitia video fupi na rahisi kueleweka za Kiliswahili.</p>
          </div>

          {/* Search */}
          <div className="learn-controls">
            <div className="learn-search">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Tafuta video..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Categories */}
          <div className="learn-categories">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                className={`learn-category-btn ${activeCategory === cat.value ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.value)}
              >
                <i className={cat.icon}></i> {cat.label}
              </button>
            ))}
          </div>

          {/* Error message */}
          {error && (
            <div className="learn-error">
              <i className="fas fa-exclamation-triangle"></i>
              <p>Tulionyesha video za mfano. Video rasmi zitakuja baada ya upakiaji.</p>
            </div>
          )}

          {/* Video Grid */}
          {filteredVideos.length === 0 ? (
            <div className="learn-empty">
              <i className="fas fa-video-slash"></i>
              <h3>Hakuna Video Ipatikanayo</h3>
              <p>Badilisha utafutaji wako.</p>
            </div>
          ) : (
            <div className="learn-grid">
              {filteredVideos.map(video => (
                <div key={video._id} className="learn-card">
                  <div className="learn-thumbnail" onClick={() => openPlayer(video)}>
                    <div className="learn-thumbnail-icon">
                      <i className={getTag(video.category)}></i>
                    </div>
                    <div className="learn-play-overlay">
                      <i className="fas fa-play"></i>
                    </div>
                    {video.duration && <span className="learn-duration">{video.duration}</span>}
                  </div>
                  <div className="learn-card-content">
                    <span className="learn-card-category">
                      {CATEGORIES.find(c => c.value === video.category)?.label || video.category}
                    </span>
                    <h3>{video.title}</h3>
                    {video.description && <p>{video.description}</p>}
                    <div className="learn-card-meta">
                      {video.views && (
                        <span><i className="fas fa-eye"></i> {video.views} views</span>
                      )}
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => openPlayer(video)}
                    >
                      <i className="fas fa-play"></i> Angalia Video
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Video modal */}
          {selectedVideo && (
            <div className="learn-overlay" onClick={() => setSelectedVideo(null)}>
              <div className="learn-modal" onClick={(e) => e.stopPropagation()}>
                <div className="learn-modal-header">
                  <h3>{selectedVideo.title}</h3>
                  <button onClick={() => setSelectedVideo(null)}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                {selectedVideo.url ? (
                  <div className="learn-video-frame">
                    {!playing ? (
                      <button className="learn-big-play" onClick={() => setPlaying(true)}>
                        <i className="fas fa-play"></i>
                      </button>
                    ) : (
                      <video
                        src={selectedVideo.url}
                        controls
                        autoPlay
                        className="learn-video-element"
                      ></video>
                    )}
                  </div>
                ) : (
                  <div className="learn-video-placeholder">
                    <i className="fas fa-video"></i>
                    <p>Video haijapakiwa bado.</p>
                    <p className="learn-placeholder-caption">Video hii itapatikana hivi karibuni. Endelea kusoma maelezo yake hapa chini.</p>
                  </div>
                )}
                <div className="learn-modal-body">
                  <p className="learn-video-description">
                    {selectedVideo.description || 'Mafunzo haya yanalenga kuboresha ujuzi wa kilimo kwa wakulima wa Katavi.'}
                  </p>
                  {selectedVideo.duration && (
                    <span className="learn-video-meta">
                      <i className="fas fa-clock"></i> Muda: {selectedVideo.duration}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Training CTA */}
          <div className="learn-cta">
            <div className="learn-cta-content">
              <h3>Unahitaji Mafunzo ya Nyanjani?</h3>
              <p>Wasiliana na wataalamu wetu wa kilimo kwa mafunzo ya moja kwa moja vijijini.</p>
              <a href="/advice" className="btn btn-primary btn-lg">
                <i className="fas fa-user-graduate"></i> Pata Mtaalamu
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Learn;