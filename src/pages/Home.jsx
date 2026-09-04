import React from 'react';
import { useNavigate } from 'react-router-dom';
import Hero from '../components/Hero/Hero';
import Features from '../components/Features/Features';
import MarketPreview from '../components/MarketPreview/MarketPreview';
import WeatherWidget from '../components/WeatherWidget/WeatherWidget';
import ExpertSection from '../components/ExpertSection/ExpertSection';
import Overview from '../components/Overview/Overview';
import { useAuth } from '../shared/context/AuthContext';

const Home = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handlePageChange = (page) => {
    const routes = { home: '/', market: '/market', news: '/news', weather: '/weather', advice: '/advice', inputs: '/inputs', suppliers: '/suppliers', loans: '/loans', 'farmer-groups': '/farmer-groups', about: '/about', contact: '/contact', login: '/login', register: '/register', dashboard: '/dashboard' };
    navigate(routes[page] || '/');
  };

  const handleAuth = (action) => {
    if (action === 'login') navigate('/login');
    else if (action === 'register') navigate('/register');
    else if (action === 'logout') { logout(); navigate('/'); }
  };

  return (
    <div className="min-h-screen bg-background">
      <Hero onAuth={handleAuth} />
      <Features onPageChange={handlePageChange} />
      <Overview onPageChange={handlePageChange} />
      <MarketPreview onPageChange={handlePageChange} />
      <WeatherWidget onPageChange={handlePageChange} />
      <ExpertSection onPageChange={handlePageChange} />
    </div>
  );
};

export default Home;
