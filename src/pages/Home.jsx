import React from 'react';
import Navigation from '../components/Navigation/Navigation';
import Hero from '../components/Hero/Hero';
import Features from '../components/Features/Features';
import MarketPreview from '../components/MarketPreview/MarketPreview';
import WeatherWidget from '../components/WeatherWidget/WeatherWidget';
import ExpertSection from '../components/ExpertSection/ExpertSection';
import Footer from '../components/Footer/Footer';

const Home = ({ crops, onPageChange, onAuth, user }) => {
  const handleContactFarmer = (crop) => {
    alert(`Utawasiliana na ${crop.farmer} kuhusu ${crop.name}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        currentPage="home" 
        onPageChange={onPageChange}
        onAuth={onAuth}
        user={user}
      />
      <Hero onAuth={onAuth} />
      <Features onPageChange={onPageChange} />
      <MarketPreview 
        crops={crops}
        onPageChange={onPageChange}
        onContactFarmer={handleContactFarmer}
      />
      <WeatherWidget onPageChange={onPageChange} />
      <ExpertSection onPageChange={onPageChange} />
      <Footer onPageChange={onPageChange} />
    </div>
  );
};

export default Home;