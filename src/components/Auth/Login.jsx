import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../api/client';
import { useAuth } from '../../shared/context/AuthContext';
import './Login.css';

const Login = () => {
  const { login: loginUser, loginWithUser, user } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const navigate = useNavigate();

  // Dashboard paths based on user role
  const dashboardPaths = {
    farmer: '/farmer-dashboard',
    buyer: '/buyer-dashboard',
    expert: '/expert-dashboard',
    admin: '/admin-dashboard'
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Clear general error
    if (errors.general) {
      setErrors(prev => ({
        ...prev,
        general: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Barua pepe inahitajika';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Barua pepe siyo sahihi';
    }

    if (!formData.password) {
      newErrors.password = 'Nenosiri linahitajika';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Nenosiri lazima liwe na herufi 6 au zaidi';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const loggedInUser = await loginUser(formData.email, formData.password);

      if (loggedInUser.requiresTwoFactor) {
        setTwoFactorStep({ email: formData.email });
        setErrors({});
        return;
      }

      alert(`Karibu tena, ${loggedInUser.name}!`);

      const dashboardPath = dashboardPaths[loggedInUser.role] || '/dashboard';
      navigate(dashboardPath);
    } catch (error) {
      setErrors({
        general: error.response?.data?.message || 'Hitilafu imetokea. Tafadhali jaribu tena baadae.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyTwoFactor = async (e) => {
    e.preventDefault();
    if (!twoFactorCode.trim()) {
      setErrors({ general: 'Weka namba ya 2FA' });
      return;
    }
    setIsLoading(true);
    try {
      const res = await authAPI.verifyTwoFactor({
        email: twoFactorStep.email,
        code: twoFactorCode.trim(),
      });
      loginWithUser(res.data);
      alert(`Karibu tena, ${res.data.name}!`);
      const dashboardPath = dashboardPaths[res.data.role] || '/dashboard';
      navigate(dashboardPath);
    } catch (error) {
      setErrors({
        general: error.response?.data?.message || 'Namba ya 2FA siyo sahihi.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendTwoFactor = async () => {
    setIsLoading(true);
    try {
      await authAPI.resendTwoFactor(twoFactorStep.email);
      setErrors({ general: 'Namba mpya imetumwa.' });
    } catch (error) {
      setErrors({ general: error.response?.data?.message || 'Hitilafu imetokea' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!formData.email) {
      setErrors({ email: 'Tafadhali weka barua pepe yako kwa ajili ya kubadilisha nenosiri' });
      return;
    }

    // Simulate password reset process
    alert(`Ujumbe wa kubadilisha nenosiri umetumwa kwa: ${formData.email}`);
  };

  const handleSocialLogin = (provider) => {
    alert(`Kuingia kwa kutumia ${provider} itafunguliwa hivi karibuni!`);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // If user is already logged in, redirect to dashboard
  if (user) {
    const dashboardPath = dashboardPaths[user.role] || '/dashboard';
    navigate(dashboardPath);
    return null;
  }

  return (
    <div className="page login-page">
      
      <div className="login-container">
        <div className="container">
          <div className="login-content">
            {/* Login Header */}
            <div className="login-header">
              <div className="login-logo">
                <i className="fas fa-seedling"></i>
                <h1>Katavi E-Kilimo</h1>
              </div>
              <h2>Ingia kwenye Akaunti Yako</h2>
              <p>Endelea na mazungumzo yako ya kilimo na biashara</p>
            </div>

            {/* Login Form */}
            <div className="login-card">
              {errors.general && (
                <div className="alert alert-error">
                  <i className="fas fa-exclamation-circle"></i>
                  {errors.general}
                </div>
              )}

              {twoFactorStep ? (
                <form onSubmit={handleVerifyTwoFactor} className="login-form">
                  <div className="form-group">
                    <label htmlFor="2fa" className="form-label">
                      Namba ya Uhakiki (2FA) *
                    </label>
                    <div className="input-group">
                      <i className="fas fa-shield-halved input-icon"></i>
                      <input
                        type="text"
                        id="2fa"
                        name="2fa"
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value)}
                        className="form-control"
                        placeholder="Namba ya tarakimu 6"
                        maxLength="6"
                        autoComplete="one-time-code"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className={`btn btn-primary login-btn ${isLoading ? 'loading' : ''}`}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Inathibitisha...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check-circle"></i>
                        Thibitisha
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={handleResendTwoFactor}
                    disabled={isLoading}
                    style={{ width: '100%', marginTop: '8px' }}
                  >
                    Tuma namba mpya
                  </button>
                </form>
              ) : (
              <form onSubmit={handleSubmit} className="login-form">
                {/* Email Field */}
                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    Barua Pepe *
                  </label>
                  <div className="input-group">
                    <i className="fas fa-envelope input-icon"></i>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`form-control ${errors.email ? 'error' : ''}`}
                      placeholder="Weka barua pepe yako"
                      autoComplete="email"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.email && (
                    <div className="error-message">
                      <i className="fas fa-exclamation-triangle"></i>
                      {errors.email}
                    </div>
                  )}
                </div>

                {/* Password Field */}
                <div className="form-group">
                  <label htmlFor="password" className="form-label">
                    Nenosiri *
                  </label>
                  <div className="input-group">
                    <i className="fas fa-lock input-icon"></i>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`form-control ${errors.password ? 'error' : ''}`}
                      placeholder="Weka nenosiri lako"
                      autoComplete="current-password"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={togglePasswordVisibility}
                      disabled={isLoading}
                    >
                      <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                  {errors.password && (
                    <div className="error-message">
                      <i className="fas fa-exclamation-triangle"></i>
                      {errors.password}
                    </div>
                  )}
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="form-options">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                    <span className="checkmark"></span>
                    Kumbuka Mimi
                  </label>
                  
                  <button
                    type="button"
                    className="forgot-password"
                    onClick={handleForgotPassword}
                    disabled={isLoading}
                  >
                    Umesahau Nenosiri?
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className={`btn btn-primary login-btn ${isLoading ? 'loading' : ''}`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Inaingiza...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-sign-in-alt"></i>
                      Ingia Sasa
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="divider">
                  <span>au ingia kwa</span>
                </div>

                {/* Social Login Options */}
                <div className="social-login">
                  <button
                    type="button"
                    className="btn btn-social google-btn"
                    onClick={() => handleSocialLogin('Google')}
                    disabled={isLoading}
                  >
                    <i className="fab fa-google"></i>
                    Google
                  </button>
                  
                  <button
                    type="button"
                    className="btn btn-social facebook-btn"
                    onClick={() => handleSocialLogin('Facebook')}
                    disabled={isLoading}
                  >
                    <i className="fab fa-facebook-f"></i>
                    Facebook
                  </button>
                </div>
              </form>
              )}

              {/* Registration Prompt */}
              <div className="registration-prompt">
                <p>Huna akaunti bado? 
                  <button 
                    onClick={() => navigate('/register')}
                    className="register-link"
                    disabled={isLoading}
                  >
                    Jisajili Hapa
                  </button>
                </p>
              </div>

              {/* Demo Accounts */}
              <div className="demo-accounts">
                <h4>Akaunti za Majaribio:</h4>
                <div className="demo-grid">
                  <div className="demo-account">
                    <div className="demo-role"><i className="fas fa-user"></i> Mkulima</div>
                    <div className="demo-email">juma@example.com</div>
                    <div className="demo-password">password123</div>
                    <button 
                      className="btn btn-sm btn-outline"
                      onClick={() => {
                        setFormData({
                          email: 'juma@example.com',
                          password: 'password123',
                          rememberMe: false
                        });
                      }}
                      disabled={isLoading}
                    >
                      Tumia
                    </button>
                  </div>
                  <div className="demo-account">
                    <div className="demo-role">🛒 Mnunuzi</div>
                    <div className="demo-email">asha@example.com</div>
                    <div className="demo-password">password123</div>
                    <button 
                      className="btn btn-sm btn-outline"
                      onClick={() => {
                        setFormData({
                          email: 'asha@example.com',
                          password: 'password123',
                          rememberMe: false
                        });
                      }}
                      disabled={isLoading}
                    >
                      Tumia
                    </button>
                  </div>
                  <div className="demo-account">
                    <div className="demo-role">🎓 Mtaalamu</div>
                    <div className="demo-email">mohamed@example.com</div>
                    <div className="demo-password">password123</div>
                    <button 
                      className="btn btn-sm btn-outline"
                      onClick={() => {
                        setFormData({
                          email: 'mohamed@example.com',
                          password: 'password123',
                          rememberMe: false
                        });
                      }}
                      disabled={isLoading}
                    >
                      Tumia
                    </button>
                  </div>
                  <div className="demo-account admin-account">
                    <div className="demo-role"><i className="fas fa-user-shield"></i> Admin</div>
                    <div className="demo-email">admin@katavi.co.tz</div>
                    <div className="demo-password">Admin@1234</div>
                    <button 
                      className="btn btn-sm btn-outline"
                      onClick={() => {
                        setFormData({
                          email: 'admin@katavi.co.tz',
                          password: 'Admin@1234',
                          rememberMe: false
                        });
                      }}
                      disabled={isLoading}
                    >
                      Tumia
                    </button>
                  </div>
                </div>
                <div className="demo-note">
                  <small>
                    <i className="fas fa-info-circle"></i>
                    Tumia akaunti hizi za majaribio kuona jinsi mfumo unavyofanya kazi
                  </small>
                </div>
              </div>
            </div>

            {/* Features Showcase */}
            <div className="features-section">
              <h3>Kwa Nini Kujiunga Na Sisi?</h3>
              <div className="features-grid">
                <div className="feature-card">
                  <i className="fas fa-users"></i>
                  <h4>Jamii ya Wakulima</h4>
                  <p>Jiunge na jamii ya wakulima wa Mkoa wa Katavi</p>
                </div>
                <div className="feature-card">
                  <i className="fas fa-chart-line"></i>
                  <h4>Pata Bei za Soko</h4>
                  <p>Fuata bei za soko la mazao kwa uhakika</p>
                </div>
                <div className="feature-card">
                  <i className="fas fa-hand-holding-usd"></i>
                  <h4>Mikopo kwa Wakulima</h4>
                  <p>Pata mikopo kwa urahisi kwa shughuli zako za kilimo</p>
                </div>
                <div className="feature-card">
                  <i className="fas fa-cloud-sun"></i>
                  <h4>Taarifa za Mazingira</h4>
                  <p>Pata taarifa za hali ya hewa na ushauri wa kilimo</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Login;