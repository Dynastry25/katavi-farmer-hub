import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
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

// Main App Component with Router
function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </Router>
  );
}

// App Content Component that uses router hooks
function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [crops] = useState(sampleCrops);
  const [articles] = useState(newsArticles);
  const [pageHistory, setPageHistory] = useState([]); // Ukumbusho wa historia ya kurasa
  
  const location = useLocation();
  const navigate = useNavigate();

  // Get current page from URL path
  const getCurrentPageFromPath = (pathname) => {
    const path = pathname.replace('/', '');
    if (path === '' || path === 'home') return 'home';
    return path;
  };

  const currentPage = getCurrentPageFromPath(location.pathname);

  // Simulate initial app loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    // Check if user is logged in from localStorage
    const savedUser = localStorage.getItem('kataviUser');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
    }

    // Check if there's a saved page in localStorage and redirect
    const savedPage = localStorage.getItem('kataviCurrentPage');
    if (savedPage && savedPage !== 'home' && savedPage !== currentPage) {
      navigate(`/${savedPage}`);
    }

    // Initialize page history
    setPageHistory(['home']);

    return () => clearTimeout(timer);
  }, [navigate, currentPage]);

  // Update page history when location changes
  useEffect(() => {
    if (currentPage && pageHistory.length > 0) {
      const previousPage = pageHistory[pageHistory.length - 1];
      
      // Only add to history if it's a new page
      if (previousPage !== currentPage) {
        setPageHistory(prev => [...prev, currentPage]);
      }
    }
  }, [location.pathname]);

  const handlePageChange = (page) => {
    // Save current page to localStorage
    localStorage.setItem('kataviCurrentPage', page);
    
    // Show loading when changing pages
    setPageLoading(true);
    
    setTimeout(() => {
      navigate(`/${page === 'home' ? '' : page}`);
      window.scrollTo(0, 0);
      
      // Hide loading after page transition
      setTimeout(() => {
        setPageLoading(false);
      }, 500);
    }, 600);
  };

  // New function to go back to previous page
  const handleGoBack = () => {
    if (pageHistory.length > 1) {
      const previousPages = [...pageHistory];
      previousPages.pop(); // Remove current page
      const previousPage = previousPages.pop(); // Get the previous page
      
      if (previousPage) {
        setPageHistory(previousPages);
        handlePageChange(previousPage);
      }
    } else {
      // If no history, go to home
      handlePageChange('home');
    }
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
        localStorage.setItem('kataviCurrentPage', 'farmer-dashboard');
        navigate('/farmer-dashboard');
        setPageLoading(false);
      }, 1500);
      
    } else if (action === 'register') {
      setPageLoading(true);
      setTimeout(() => {
        localStorage.setItem('kataviCurrentPage', 'registration');
        navigate('/registration');
        setPageLoading(false);
      }, 800);
      
    } else if (action === 'logout') {
      setPageLoading(true);
      setTimeout(() => {
        setUser(null);
        localStorage.removeItem('kataviUser');
        localStorage.setItem('kataviCurrentPage', 'home');
        navigate('/');
        setPageLoading(false);
      }, 800);
      
    } else if (action === 'register-success' && userData) {
      setPageLoading(true);
      setTimeout(() => {
        setUser(userData);
        localStorage.setItem('kataviUser', JSON.stringify(userData));
        
        // Redirect to appropriate dashboard based on user role
        let targetPage = 'home';
        if (userData.role === 'farmer') {
          targetPage = 'farmer-dashboard';
        } else if (userData.role === 'expert') {
          targetPage = 'expert-dashboard';
        } else if (userData.role === 'buyer') {
          targetPage = 'buyer-dashboard';
        }
        
        localStorage.setItem('kataviCurrentPage', targetPage);
        navigate(`/${targetPage}`);
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

  // Common props for all pages
  const commonProps = {
    onPageChange: handlePageChange,
    onGoBack: handleGoBack, // Add go back function
    onAuth: handleAuth,
    user: user,
    canGoBack: pageHistory.length > 1 // Indicate if back navigation is possible
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
    <div className="App">
      <Routes>
        {/* Home Route */}
        <Route path="/" element={
          <div className="min-h-screen bg-background">
            <Navigation 
              currentPage={currentPage}
              onPageChange={handlePageChange}
              onGoBack={handleGoBack}
              onAuth={handleAuth}
              user={user}
              canGoBack={pageHistory.length > 1}
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
        } />
        
        <Route path="/home" element={<Navigate to="/" replace />} />

        {/* Public Pages */}
        <Route path="/news" element={<News {...commonProps} articles={articles} />} />
        <Route path="/market" element={
          <Market 
            {...commonProps} 
            crops={crops}
            onContactFarmer={handleContactFarmer}
            onCropDetails={handleCropDetails}
          />
        } />
        <Route path="/inputs" element={<Inputs {...commonProps} />} />
        <Route path="/advice" element={<Advice {...commonProps} />} />
        <Route path="/weather" element={<Weather {...commonProps} weatherData={weatherData} />} />
        <Route path="/about" element={<About {...commonProps} />} />
        <Route path="/contact" element={<Contact {...commonProps} />} />
        <Route path="/registration" element={<Registration {...commonProps} onAuth={handleAuth} />} />

        {/* Dashboard Pages */}
        <Route path="/dashboard" element={
          user ? <Dashboard {...commonProps} user={user} crops={crops} /> : <Navigate to="/registration" />
        } />
        
        <Route path="/farmer-dashboard" element={
          user && user.role === 'farmer' ? 
            <FarmerDashboard {...commonProps} user={user} crops={crops} /> : 
            <Navigate to="/registration" />
        } />
        
        <Route path="/expert-dashboard" element={
          user && user.role === 'expert' ? 
            <ExpertDashboard {...commonProps} user={user} /> : 
            <Navigate to="/registration" />
        } />
        
        <Route path="/buyer-dashboard" element={
          user && user.role === 'buyer' ? 
            <BuyerDashboard {...commonProps} user={user} crops={crops} /> : 
            <Navigate to="/registration" />
        } />

        {/* Fallback route - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Floating Contact - Show on all pages except dashboards */}
      {!currentPage.includes('dashboard') && <FloatingContact />}
    </div>
  );
}

export default App;