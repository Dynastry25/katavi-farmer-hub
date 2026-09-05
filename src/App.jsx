import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './shared/context/AuthContext';
import { SocketProvider } from './shared/context/SocketContext';
import { LangProvider } from './shared/context/LangContext';
import Loading from './components/Loading/Loading';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import ChatWidget from './components/ChatWidget/ChatWidget';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

const PublicLayout = lazy(() => import('./shared/layouts/PublicLayout'));
const Home = lazy(() => import('./pages/Home'));
const Market = lazy(() => import('./pages/Market'));
const News = lazy(() => import('./pages/News'));
const Weather = lazy(() => import('./pages/Weather'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Advice = lazy(() => import('./pages/Advice'));
const Inputs = lazy(() => import('./pages/Inputs'));
const Suppliers = lazy(() => import('./components/Suppliers'));
const Loans = lazy(() => import('./components/Loans'));
const FarmerGroups = lazy(() => import('./components/FarmerGroups'));
const Login = lazy(() => import('./components/Auth/Login'));
const Registration = lazy(() => import('./components/Auth/Registration'));

const AdminDashboard = lazy(() => import('./components/Admin/AdminDashboard'));
const FarmerDashboard = lazy(() => import('./components/Admin/FarmerDashboard'));
const BuyerDashboard = lazy(() => import('./components/Admin/BuyerDashboard'));
const ExpertDashboard = lazy(() => import('./components/Admin/ExpertDashboard'));
const AdminReports = lazy(() => import('./components/Admin/AdminReports'));
const Profile = lazy(() => import('./components/Admin/Profile'));
const Reports = lazy(() => import('./components/Admin/Reports'));

const RouteLoading = () => (
  <div className="route-loading">
    <Loading message="Inapakia..." />
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <LangProvider>
        <AuthProvider>
          <SocketProvider>
            <div className="App">
              <Suspense fallback={<RouteLoading />}>
                <Routes>
                  <Route element={<PublicLayout />}>
                    <Route index element={<Home />} />
                    <Route path="market" element={<Market />} />
                    <Route path="news" element={<News />} />
                    <Route path="weather" element={<Weather />} />
                    <Route path="advice" element={<Advice />} />
                    <Route path="inputs" element={<Inputs />} />
                    <Route path="suppliers" element={<Suppliers />} />
                    <Route path="loans" element={<Loans />} />
                    <Route path="farmer-groups" element={<FarmerGroups />} />
                    <Route path="about" element={<About />} />
                    <Route path="contact" element={<Contact />} />
                  </Route>

                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Registration />} />

                  <Route path="/dashboard" element={<ProtectedRoute roles={['farmer']}><FarmerDashboard /></ProtectedRoute>} />
                  <Route path="/farmer-dashboard" element={<ProtectedRoute roles={['farmer']}><FarmerDashboard /></ProtectedRoute>} />
                  <Route path="/buyer-dashboard" element={<ProtectedRoute roles={['buyer']}><BuyerDashboard /></ProtectedRoute>} />
                  <Route path="/expert-dashboard" element={<ProtectedRoute roles={['expert']}><ExpertDashboard /></ProtectedRoute>} />
                  <Route path="/admin-dashboard" element={<ProtectedRoute roles={['admin', 'support', 'content_moderator', 'finance_officer']}><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/admin-reports" element={<ProtectedRoute roles={['admin']}><AdminReports /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                  <Route path="/my-reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />

                  <Route path="*" element={
                    <div className="not-found-page">
                      <div className="not-found-container">
                        <div className="not-found-content">
                          <h1>404 - Ukurasa Haupatikani</h1>
                          <p>Samahani, ukurasa unaoutafuta haupo.</p>
                          <a href="/" className="btn btn-primary">Rudi Nyumbani</a>
                        </div>
                      </div>
                    </div>
                  } />
                </Routes>
              </Suspense>
              <ChatWidget />
            </div>
          </SocketProvider>
        </AuthProvider>
      </LangProvider>
    </ErrorBoundary>
  );
}

export default App;
