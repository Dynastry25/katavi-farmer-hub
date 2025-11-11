import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import './App.css';

// Import Components
import Navigation from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import Loading from './components/Loading/Loading';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';

// Lazy load components for better performance
const Home = lazy(() => import('./pages/Home'));
const Market = lazy(() => import('./pages/Market'));
const Suppliers = lazy(() => import('./components/Suppliers'));
const Loans = lazy(() => import('./components/Loans'));
const FarmerGroups = lazy(() => import('./components/FarmerGroups'));
const Reports = lazy(() => import('./components/Reports'));
const Weather = lazy(() => import('./pages/Weather'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Login = lazy(() => import('./components/Auth/Login'));
const Registration = lazy(() => import('./components/Auth/Registration'));
const Dashboard = lazy(() => import('./components/Dashboards/Dashboard'));
const FarmerDashboard = lazy(() => import('./components/Dashboards/FarmerDashboard'));
const BuyerDashboard = lazy(() => import('./components/Dashboards/BuyerDashboard'));
const ExpertDashboard = lazy(() => import('./components/Dashboards/ExpertDashboard'));
const ChatSystem = lazy(() => import('./components/ChatSystem/ChatSystem'));

// Import additional pages
const News = lazy(() => import('./pages/News'));
const Inputs = lazy(() => import('./pages/Inputs'));
const Advice = lazy(() => import('./pages/Advice'));

// Loading wrapper component for routes
const RouteLoading = ({ message = "Inapakia..." }) => (
  <div className="route-loading">
    <Loading message={message} />
  </div>
);

// Component to handle page transitions and loading
const PageTransitionHandler = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Scroll to top immediately when route changes
    window.scrollTo(0, 0);
    
    // Show loading when route changes
    setIsLoading(true);
    
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500); // Minimum loading time for better UX

    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (isLoading) {
    return <RouteLoading message="Inapakia ukurasa..." />;
  }

  return children;
};

// Main App Component
function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [currentUser, setCurrentUser] = useState(null);
  const [crops, setCrops] = useState([]);
  const [users, setUsers] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [appLoading, setAppLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Scroll to top on every route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Sample data
  const sampleCrops = [
    {
      id: 1,
      name: 'Mahindi',
      farmer: 'Juma Mwinyi',
      price: 1500,
      quantity: 100,
      location: 'Mpanda',
      description: 'Mahindi bora yenye ubora wa hali ya juu',
      image: '🌽',
      type: 'cereal',
      status: 'available',
      rating: 4.5,
      harvestDate: '2024-02-01'
    },
    {
      id: 2,
      name: 'Mpunga',
      farmer: 'Asha Hassan',
      price: 2000,
      quantity: 50,
      location: 'Mlele',
      description: 'Mpunga mweupe wa aina bora',
      image: '🌾',
      type: 'cereal',
      status: 'available',
      rating: 4.8,
      harvestDate: '2024-01-25'
    }
  ];

  const sampleUsers = [
    {
      id: 1,
      name: 'Juma Mwinyi',
      email: 'juma@example.com',
      phone: '+255 789 123 456',
      role: 'farmer',
      location: 'Mpanda',
      farmSize: 'Ekari 5',
      crops: ['Mahindi', 'Mpunga'],
      registrationDate: '2024-01-01T10:00:00Z',
      rating: 4.8
    },
    {
      id: 2,
      name: 'Asha Hassan',
      email: 'asha@example.com',
      phone: '+255 789 654 321',
      role: 'buyer',
      location: 'Mlele',
      businessType: 'Duka la Rejareja',
      registrationDate: '2024-01-05T14:30:00Z',
      rating: 4.9
    }
  ];

  // Initialize app data
  useEffect(() => {
    const initializeApp = async () => {
      setAppLoading(true);
      
      try {
        // Simulate API calls for initial data
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setCrops(sampleCrops);
        setUsers(sampleUsers);
        
        // Check if user is logged in from localStorage
        const savedUser = localStorage.getItem('kataviUser');
        if (savedUser) {
          setCurrentUser(JSON.parse(savedUser));
        }
        
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setAppLoading(false);
      }
    };

    initializeApp();
  }, [refreshTrigger]);

  // Handle page changes
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  // Handle authentication - UPDATED LOGOUT
  const handleAuth = (action, userData = null) => {
    switch (action) {
      case 'login':
        setCurrentPage('login');
        break;
      
      case 'register':
        setCurrentPage('registration');
        break;
      
      case 'register-success':
        if (userData) {
          const newUser = {
            ...userData,
            id: Math.random().toString(36).substr(2, 9),
            registrationDate: new Date().toISOString(),
            rating: 5.0
          };
          
          setCurrentUser(newUser);
          setUsers(prev => [...prev, newUser]);
          localStorage.setItem('kataviUser', JSON.stringify(newUser));
          
          setTimeout(() => {
            setCurrentPage('dashboard');
            window.scrollTo(0, 0);
          }, 1000);
        }
        break;
      
      case 'login-success':
        if (userData) {
          setCurrentUser(userData);
          localStorage.setItem('kataviUser', JSON.stringify(userData));
          setCurrentPage('dashboard');
          window.scrollTo(0, 0);
        }
        break;

      case 'logout':
        setCurrentUser(null);
        localStorage.removeItem('kataviUser');
        setCurrentPage('home');
        window.scrollTo(0, 0);
        break;
      
      default:
        break;
    }
  };

  // Handle going back
  const handleGoBack = () => {
    const pagesHistory = ['home', 'market', 'inputs', 'suppliers', 'loans', 'farmer-groups', 'advice', 'news', 'reports', 'weather', 'about', 'contact'];
    const currentIndex = pagesHistory.indexOf(currentPage);
    
    if (currentIndex > 0) {
      setCurrentPage(pagesHistory[currentIndex - 1]);
    } else {
      setCurrentPage('home');
    }
    window.scrollTo(0, 0);
  };

  // Toggle chat system
  const handleToggleChat = () => {
    setShowChat(!showChat);
  };

  // Refresh app data
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    window.scrollTo(0, 0);
  };

  // Handle creating farmer groups
  const handleCreateGroup = (groupData) => {
    console.log('Creating group:', groupData);
    alert(`Kikundi "${groupData.name}" kimeundwa kikamilifu!`);
  };

  // Handle loan applications
  const handleApplyForLoan = (loanData) => {
    console.log('Applying for loan:', loanData);
    alert(`Maombi yako ya mkopo "${loanData.name}" yamewasilishwa!`);
  };

  // Add new crop
  const handleAddCrop = (cropData) => {
    const newCrop = {
      id: crops.length + 1,
      ...cropData,
      farmer: currentUser?.name || 'Mkulima',
      location: currentUser?.location || 'Katavi',
      status: 'available',
      rating: 5.0,
      image: '🌱'
    };
    setCrops(prev => [...prev, newCrop]);
    return newCrop;
  };

  // Update crop
  const handleUpdateCrop = (cropId, updatedData) => {
    setCrops(prev => prev.map(crop => 
      crop.id === cropId ? { ...crop, ...updatedData } : crop
    ));
  };

  // Delete crop
  const handleDeleteCrop = (cropId) => {
    setCrops(prev => prev.filter(crop => crop.id !== cropId));
  };

  // Set canGoBack based on current page
  useEffect(() => {
    setCanGoBack(currentPage !== 'home');
  }, [currentPage]);

  // Show app loading
  if (appLoading) {
    return (
      <div className="app-loading">
        <Loading message="Inaanzisha jukwaa la Katavi E-Kilimo..." />
      </div>
    );
  }

  return (
    <div className="App">
      <Suspense fallback={<RouteLoading message="Inapakia programu..." />}>
        <Routes>
          {/* Public Routes */}
          <Route 
            key="home"
            path="/" 
            element={
              <PageTransitionHandler>
                <Home 
                  onPageChange={handlePageChange}
                  onAuth={handleAuth}
                  user={currentUser}
                  crops={crops}
                  onRefresh={handleRefresh}
                />
              </PageTransitionHandler>
            } 
          />
          
          <Route 
            key="market"
            path="/market" 
            element={
              <PageTransitionHandler>
                <Market 
                  onPageChange={handlePageChange}
                  onAuth={handleAuth}
                  user={currentUser}
                  crops={crops}
                  onAddCrop={handleAddCrop}
                  onUpdateCrop={handleUpdateCrop}
                  onDeleteCrop={handleDeleteCrop}
                  onRefresh={handleRefresh}
                />
              </PageTransitionHandler>
            } 
          />
          
          <Route 
            key="inputs"
            path="/inputs" 
            element={
              <PageTransitionHandler>
                <Inputs 
                  onPageChange={handlePageChange}
                  onAuth={handleAuth}
                  user={currentUser}
                  onRefresh={handleRefresh}
                />
              </PageTransitionHandler>
            } 
          />
          
          <Route 
            key="suppliers"
            path="/suppliers" 
            element={
              <PageTransitionHandler>
                <Suppliers 
                  onPageChange={handlePageChange}
                  onAuth={handleAuth}
                  user={currentUser}
                  onRefresh={handleRefresh}
                />
              </PageTransitionHandler>
            } 
          />
          
          <Route 
            key="loans"
            path="/loans" 
            element={
              <PageTransitionHandler>
                <Loans 
                  onPageChange={handlePageChange}
                  onAuth={handleAuth}
                  user={currentUser}
                  onApplyForLoan={handleApplyForLoan}
                  onRefresh={handleRefresh}
                />
              </PageTransitionHandler>
            } 
          />
          
          <Route 
            key="farmer-groups"
            path="/farmer-groups" 
            element={
              <PageTransitionHandler>
                <FarmerGroups 
                  onPageChange={handlePageChange}
                  onAuth={handleAuth}
                  user={currentUser}
                  onCreateGroup={handleCreateGroup}
                  onRefresh={handleRefresh}
                />
              </PageTransitionHandler>
            } 
          />
          
          <Route 
            key="advice"
            path="/advice" 
            element={
              <PageTransitionHandler>
                <Advice 
                  onPageChange={handlePageChange}
                  onAuth={handleAuth}
                  user={currentUser}
                  onRefresh={handleRefresh}
                />
              </PageTransitionHandler>
            } 
          />
          
          <Route 
            key="news"
            path="/news" 
            element={
              <PageTransitionHandler>
                <News 
                  onPageChange={handlePageChange}
                  onAuth={handleAuth}
                  user={currentUser}
                  onRefresh={handleRefresh}
                />
              </PageTransitionHandler>
            } 
          />
          
          <Route 
            key="reports"
            path="/reports" 
            element={
              <PageTransitionHandler>
                <Reports 
                  onPageChange={handlePageChange}
                  onAuth={handleAuth}
                  user={currentUser}
                  crops={crops}
                  onRefresh={handleRefresh}
                />
              </PageTransitionHandler>
            } 
          />
          
          <Route 
            key="weather"
            path="/weather" 
            element={
              <PageTransitionHandler>
                <Weather 
                  onPageChange={handlePageChange}
                  onAuth={handleAuth}
                  user={currentUser}
                  onRefresh={handleRefresh}
                />
              </PageTransitionHandler>
            } 
          />
          
          <Route 
            key="about"
            path="/about" 
            element={
              <PageTransitionHandler>
                <About 
                  onPageChange={handlePageChange}
                  onAuth={handleAuth}
                  user={currentUser}
                  onRefresh={handleRefresh}
                />
              </PageTransitionHandler>
            } 
          />
          
          <Route 
            key="contact"
            path="/contact" 
            element={
              <PageTransitionHandler>
                <Contact 
                  onPageChange={handlePageChange}
                  onAuth={handleAuth}
                  user={currentUser}
                  onRefresh={handleRefresh}
                />
              </PageTransitionHandler>
            } 
          />

          {/* Auth Routes */}
          <Route 
            key="login"
            path="/login" 
            element={
              <PageTransitionHandler>
                <Login 
                  onPageChange={handlePageChange}
                  onAuth={handleAuth}
                  user={currentUser}
                  onRefresh={handleRefresh}
                />
              </PageTransitionHandler>
            } 
          />
          
          <Route 
            key="register"
            path="/register" 
            element={
              <PageTransitionHandler>
                <Registration 
                  onPageChange={handlePageChange}
                  onAuth={handleAuth}
                  user={currentUser}
                  onRefresh={handleRefresh}
                />
              </PageTransitionHandler>
            } 
          />

          {/* Dashboard Routes */}
          <Route 
            key="dashboard"
            path="/dashboard" 
            element={
              <PageTransitionHandler>
                <Dashboard 
                  onPageChange={handlePageChange}
                  onAuth={handleAuth}
                  user={currentUser}
                  crops={crops}
                  onToggleChat={handleToggleChat}
                  onCreateGroup={handleCreateGroup}
                  onApplyForLoan={handleApplyForLoan}
                  onRefresh={handleRefresh}
                />
              </PageTransitionHandler>
            } 
          />
          
          <Route 
            key="farmer-dashboard"
            path="/farmer-dashboard" 
            element={
              <PageTransitionHandler>
                <FarmerDashboard 
                  onPageChange={handlePageChange}
                  onAuth={handleAuth}
                  user={currentUser}
                  crops={crops.filter(crop => crop.farmer === currentUser?.name)}
                  onToggleChat={handleToggleChat}
                  onAddCrop={handleAddCrop}
                  onUpdateCrop={handleUpdateCrop}
                  onDeleteCrop={handleDeleteCrop}
                  onRefresh={handleRefresh}
                />
              </PageTransitionHandler>
            } 
          />
          
          <Route 
            key="buyer-dashboard"
            path="/buyer-dashboard" 
            element={
              <PageTransitionHandler>
                <BuyerDashboard 
                  onPageChange={handlePageChange}
                  onAuth={handleAuth}
                  user={currentUser}
                  crops={crops}
                  onToggleChat={handleToggleChat}
                  onRefresh={handleRefresh}
                />
              </PageTransitionHandler>
            } 
          />
          
          <Route 
            key="expert-dashboard"
            path="/expert-dashboard" 
            element={
              <PageTransitionHandler>
                <ExpertDashboard 
                  onPageChange={handlePageChange}
                  onAuth={handleAuth}
                  user={currentUser}
                  onToggleChat={handleToggleChat}
                  onRefresh={handleRefresh}
                />
              </PageTransitionHandler>
            } 
          />

          {/* 404 Route */}
          <Route 
            key="not-found"
            path="*" 
            element={
              <PageTransitionHandler>
                <div className="not-found-page">
                  <Navigation 
                    currentPage="404"
                    onPageChange={handlePageChange}
                    onAuth={handleAuth}
                    user={currentUser}
                    canGoBack={canGoBack}
                    onGoBack={handleGoBack}
                    onToggleChat={handleToggleChat}
                  />
                  <div className="not-found-container">
                    <div className="container">
                      <div className="not-found-content">
                        <h1>404 - Ukurasa Haupatikani</h1>
                        <p>Samahani, ukurasa unaoutafuta haupo.</p>
                        <button 
                          className="btn btn-primary"
                          onClick={() => {
                            handlePageChange('home');
                            navigate('/');
                            window.scrollTo(0, 0);
                          }}
                        >
                          Rudi Nyumbani
                        </button>
                        <button 
                          className="btn btn-outline"
                          onClick={handleRefresh}
                        >
                          <i className="fas fa-sync-alt"></i> Refresh
                        </button>
                      </div>
                    </div>
                  </div>
                  <Footer onPageChange={handlePageChange} />
                </div>
              </PageTransitionHandler>
            } 
          />
        </Routes>

        {/* Global Chat System */}
        {showChat && currentUser && (
          <Suspense fallback={<RouteLoading message="Inapakia mazungumzo..." />}>
            <ChatSystem 
              user={currentUser}
              onClose={handleToggleChat}
              onPageChange={handlePageChange}
            />
          </Suspense>
        )}

        {/* Global Refresh Button */}
        <button 
          className="global-refresh-btn"
          onClick={handleRefresh}
          title="Refresh data"
          aria-label="Refresh application data"
        >
          <i className="fas fa-sync-alt"></i>
        </button>

      </Suspense>
    </div>
  );
}

// Wrap App with ErrorBoundary and Router in a separate component
const AppWithProviders = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default AppWithProviders;