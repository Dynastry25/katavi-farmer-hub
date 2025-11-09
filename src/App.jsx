import React, { useState, useEffect } from 'react';
import Navigation from './components/Navbar/Navbar';
import Hero from './components/Hero/Hero';
import Features from './components/Features/Features';
import MarketPreview from './components/MarketPreview/MarketPreview';
import WeatherWidget from './components/WeatherWidget/WeatherWidget';
import ExpertSection from './components/ExpertSection/ExpertSection';
import Footer from './components/Footer/Footer';
import FloatingContact from './components/FloatingContact/FloatingContact';
import Loading from './components/Loading/Loading';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';

// Other Pages
import News from './pages/Advice';
import Market from './pages/Market';
import Inputs from './pages/Inputs';
import Advice from './pages/Advice';
import Weather from './pages/Weather';
import About from './pages/About';
import Contact from './pages/Contact';
import Registration from './pages/Registration';
import Dashboard from './pages/Dashboard';

// New Dashboard Pages
import FarmerDashboard from './UI/Dashboard/FarmerDashboard';
import ExpertDashboard from './UI/Dashboard/ExpertDashboard';
import BuyerDashboard from './UI/Dashboard/BuyerDashboard';

import { sampleCrops, newsArticles, weatherData, priceData } from './data/sampleData';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isLoading, setIsLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [crops] = useState(sampleCrops);
  const [articles] = useState(newsArticles);

  // Simulate initial app loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);

    // Check if user is logged in from localStorage
    const savedUser = localStorage.getItem('kataviUser');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      
      // Auto-redirect to appropriate dashboard based on user role
      if (userData.role === 'farmer') {
        setCurrentPage('farmer-dashboard');
      } else if (userData.role === 'expert') {
        setCurrentPage('expert-dashboard');
      } else if (userData.role === 'buyer') {
        setCurrentPage('buyer-dashboard');
      }
    }

    return () => clearTimeout(timer);
  }, []);

  const handlePageChange = (page) => {
    // Show loading when changing pages
    setPageLoading(true);
    
    setTimeout(() => {
      setCurrentPage(page);
      window.scrollTo(0, 0);
      
      // Hide loading after page transition
      setTimeout(() => {
        setPageLoading(false);
      }, 500);
    }, 800);
  };

  const handleAuth = (action, userData = null) => {
    if (action === 'login') {
      setPageLoading(true);
      
      // Simulate login - in real app, this would be an API call
      setTimeout(() => {
        const mockUser = {
          id: 1,
          name: 'Juma Mwinyi',
          email: 'juma@example.com',
          role: 'farmer',
          phone: '+255 123 456 789',
          location: 'Mpanda',
          registrationDate: new Date().toISOString()
        };
        setUser(mockUser);
        localStorage.setItem('kataviUser', JSON.stringify(mockUser));
        setCurrentPage('farmer-dashboard');
        setPageLoading(false);
      }, 1500);
      
    } else if (action === 'register') {
      setPageLoading(true);
      setTimeout(() => {
        setCurrentPage('registration');
        setPageLoading(false);
      }, 800);
      
    } else if (action === 'logout') {
      setPageLoading(true);
      setTimeout(() => {
        setUser(null);
        localStorage.removeItem('kataviUser');
        setCurrentPage('home');
        setPageLoading(false);
      }, 800);
      
    } else if (action === 'register-success' && userData) {
      setPageLoading(true);
      setTimeout(() => {
        setUser(userData);
        localStorage.setItem('kataviUser', JSON.stringify(userData));
        
        // Redirect to appropriate dashboard based on user role
        if (userData.role === 'farmer') {
          setCurrentPage('farmer-dashboard');
        } else if (userData.role === 'expert') {
          setCurrentPage('expert-dashboard');
        } else if (userData.role === 'buyer') {
          setCurrentPage('buyer-dashboard');
        }
        setPageLoading(false);
      }, 1500);
    }
  };

  const handleContactFarmer = (crop) => {
    alert(`📞 Utawasiliana na ${crop.farmer} kuhusu ${crop.name}\n\nSimu: +255 7XX XXX XXX\n\n"Habari ${crop.farmer}, nina nia ya kununua ${crop.name} yako."`);
  };

  const handleCropDetails = (crop) => {
    alert(`📋 Maelezo ya ${crop.name}:\n\n${crop.description}\n\nBei: TZS ${crop.price}/kg\nKiasi: ${crop.quantity} kg\nEneo: ${crop.location}\nMkulima: ${crop.farmer}\nTarehe: ${crop.date}`);
  };

  const renderPage = () => {
    const commonProps = {
      onPageChange: handlePageChange,
      onAuth: handleAuth,
      user: user
    };

    switch (currentPage) {
      case 'home':
        return (
          <div className="min-h-screen bg-background">
            <Navigation 
              currentPage={currentPage}
              onPageChange={handlePageChange}
              onAuth={handleAuth}
              user={user}
            />
            <Hero onAuth={handleAuth} />
            <Features onPageChange={handlePageChange} />
            <MarketPreview 
              crops={crops}
              onPageChange={handlePageChange}
              onContactFarmer={handleContactFarmer}
            />
            <WeatherWidget onPageChange={handlePageChange} />
            <ExpertSection onPageChange={handlePageChange} />
            <Footer onPageChange={handlePageChange} />
          </div>
        );

      case 'news':
        return <News {...commonProps} articles={articles} />;
      
      case 'market':
        return (
          <Market 
            {...commonProps} 
            crops={crops}
            onContactFarmer={handleContactFarmer}
            onCropDetails={handleCropDetails}
          />
        );
      
      case 'inputs':
        return <Inputs {...commonProps} />;
      
      case 'advice':
        return <Advice {...commonProps} />;
      
      case 'weather':
        return <Weather {...commonProps} weatherData={weatherData} />;
      
      case 'about':
        return <About {...commonProps} />;
      
      case 'contact':
        return <Contact {...commonProps} />;
      
      case 'registration':
        return <Registration {...commonProps} onAuth={handleAuth} />;
      
      case 'dashboard':
        return <Dashboard {...commonProps} user={user} crops={crops} />;
      
      // New Dashboard Pages
      case 'farmer-dashboard':
        return <FarmerDashboard {...commonProps} user={user} crops={crops} />;
      
      case 'expert-dashboard':
        return <ExpertDashboard {...commonProps} user={user} />;
      
      case 'buyer-dashboard':
        return <BuyerDashboard {...commonProps} user={user} crops={crops} />;
      
      default:
        return (
          <div className="min-h-screen bg-background">
            <Navigation 
              currentPage={currentPage}
              onPageChange={handlePageChange}
              onAuth={handleAuth}
              user={user}
            />
            <Hero onAuth={handleAuth} />
            <Features onPageChange={handlePageChange} />
            <MarketPreview 
              crops={crops}
              onPageChange={handlePageChange}
              onContactFarmer={handleContactFarmer}
            />
            <WeatherWidget onPageChange={handlePageChange} />
            <ExpertSection onPageChange={handlePageChange} />
            <Footer onPageChange={handlePageChange} />
          </div>
        );
    }
  };

  // Show initial app loading
  if (isLoading) {
    return <Loading message="Inapakia Jukwaa la Katavi E-Kilimo..." />;
  }

  // Show page transition loading
  if (pageLoading) {
    return <Loading message="Inapakia Ukurasa..." />;
  }

  return (
    <ErrorBoundary>
      <div className="App">
        {renderPage()}
        <FloatingContact />
      </div>
    </ErrorBoundary>
  );
}

export default App;