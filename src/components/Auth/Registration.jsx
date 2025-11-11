import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../Navbar/Navbar';
import Footer from '../Footer/Footer';
import './Registration.css';

const Registration = ({ onPageChange, onAuth, user, onRefresh }) => {
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    farmSize: '',
    farmLocation: '',
    crops: [],
    businessType: '',
    businessLocation: '',
    expertise: '',
    experience: '',
    district: '',
    ward: '',
    village: '',
    idNumber: '',
    dateOfBirth: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const userTypes = [
    {
      value: 'farmer',
      label: 'Mkulima',
      icon: 'fas fa-tractor',
      description: 'Nina shamba na ninauza mazao',
      dashboardPath: '/farmer-dashboard'
    },
    {
      value: 'buyer',
      label: 'Mnunuzi',
      icon: 'fas fa-shopping-cart',
      description: 'Ninanunua mazao kwa ajili ya biashara',
      dashboardPath: '/buyer-dashboard'
    },
    {
      value: 'expert',
      label: 'Mtaalamu',
      icon: 'fas fa-user-graduate',
      description: 'Nina ujuzi wa kilimo na nataka kusaidia',
      dashboardPath: '/expert-dashboard'
    }
  ];

  const cropsList = [
    'Mahindi', 'Mpunga', 'Maharage', 'Alizeti', 'Viazi', 'Mtama',
    'Uwele', 'Mbaazi', 'Karanga', 'Mikunde', 'Mihogo', 'Mazao ya Bustani'
  ];

  const districts = ['Mpanda', 'Mlele', 'Nsimbo', 'Karema'];
  const wards = ['Mpanda Mjini', 'Karema', 'Sitalike', 'Ikola', 'Kibaoni'];
  const villages = ['Kijiji cha Msingi', 'Kijiji cha Pili', 'Kijiji cha Tatu'];

  const businessTypes = [
    'Duka la Rejareja',
    'Duka la Jumla',
    'Wasanidi wa Mazao',
    'Wauzaji Nje ya Nchi',
    'Kampuni ya Chakula',
    'Mfanyabiashara Mwingine'
  ];

  const expertiseAreas = [
    'Utaalamu wa Udongo',
    'Utaalamu wa Mazao',
    'Udhibiti wa Wadudu',
    'Umwagiliaji',
    'Masoko ya Mazao',
    'Ufugaji',
    'Teknolojia ya Kilimo',
    'Mifugo'
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      if (checked) {
        setFormData(prev => ({
          ...prev,
          crops: [...prev.crops, value]
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          crops: prev.crops.filter(crop => crop !== value)
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 2) {
      if (!formData.fullName.trim()) {
        newErrors.fullName = 'Jina kamili linahitajika';
      }
      if (!formData.email.trim()) {
        newErrors.email = 'Barua pepe inahitajika';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Barua pepe siyo sahihi';
      }
      if (!formData.phone.trim()) {
        newErrors.phone = 'Namba ya simu inahitajika';
      }
      if (!formData.password) {
        newErrors.password = 'Nenosiri linahitajika';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Nenosiri lazima liwe na herufi 6 au zaidi';
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Thibitisha nenosiri linahitajika';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Nenosiri na uthibitisho wa nenosiri hazifanani';
      }
    }

    if (step === 3) {
      if (!formData.district) {
        newErrors.district = 'Wilaya inahitajika';
      }
      if (!formData.ward) {
        newErrors.ward = 'Kata inahitajika';
      }
      if (!formData.village) {
        newErrors.village = 'Kijiji kinahitajika';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUserTypeSelect = (type) => {
    setUserType(type);
    setStep(2);
  };

  const handleNext = () => {
    if (!validateStep(step)) {
      return;
    }
    
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(3)) {
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Create user object based on type
      const newUser = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        role: userType,
        location: formData.district,
        registrationDate: new Date().toISOString(),
        rating: 5.0,
        // Additional user-specific data
        ...(userType === 'farmer' && {
          farmSize: formData.farmSize,
          farmLocation: formData.farmLocation,
          crops: formData.crops,
          type: 'farmer'
        }),
        ...(userType === 'buyer' && {
          businessType: formData.businessType,
          businessLocation: formData.businessLocation,
          type: 'buyer'
        }),
        ...(userType === 'expert' && {
          expertise: formData.expertise,
          experience: formData.experience,
          type: 'expert'
        }),
        // Common additional info
        district: formData.district,
        ward: formData.ward,
        village: formData.village,
        idNumber: formData.idNumber,
        dateOfBirth: formData.dateOfBirth
      };
      
      // Trigger registration success
      onAuth('register-success', newUser);
      
      // Show success message
      alert(`Hongera ${formData.fullName}! Akaunti yako ya ${userTypes.find(t => t.value === userType)?.label} imeundwa kikamilifu.`);
      
      // Redirect to appropriate dashboard using React Router
      const selectedUserType = userTypes.find(t => t.value === userType);
      if (selectedUserType) {
        navigate(selectedUserType.dashboardPath);
      }
      
    } catch (error) {
      setErrors({ 
        general: 'Hitilafu imetokea wakati wa kusajili. Tafadhali jaribu tena.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="registration-step">
      <div className="step-header">
        <div className="step-number">1</div>
        <div className="step-info">
          <h2>Chagua Aina ya Akaunti</h2>
          <p>Chagua aina ya akaunti unayotaka kujiandikisha. Uchaguzi huu utaathiri dashibodi na huduma utakazopata.</p>
        </div>
      </div>

      <div className="user-type-grid">
        {userTypes.map(type => (
          <div
            key={type.value}
            className={`user-type-card ${userType === type.value ? 'selected' : ''}`}
            onClick={() => handleUserTypeSelect(type.value)}
          >
            <div className="type-icon">
              <i className={type.icon}></i>
            </div>
            <h3 className="type-label">{type.label}</h3>
            <p className="type-description">{type.description}</p>
            <div className="type-features">
              {type.value === 'farmer' && (
                <ul>
                  <li>⫸ Weka mazao yako kwenye soko</li>
                  <li>⫸ Pata wanunuzi wa moja kwa moja</li>
                  <li>⫸ Pata ushauri wa kilimo</li>
                  <li>⫸ Fuata bei za soko</li>
                </ul>
              )}
              {type.value === 'buyer' && (
                <ul>
                  <li>⫸ Tafuta mazao bora kwa bei nafuu</li>
                  <li>⫸ Wasiliana na wakulima moja kwa moja</li>
                  <li>⫸ Pata mazao kwa kiwango kikubwa</li>
                  <li>⫸ Angalia ubora wa mazao</li>
                </ul>
              )}
              {type.value === 'expert' && (
                <ul>
                  <li>⫸ Toa ushauri kwa wakulima</li>
                  <li>⫸ Andika makala za kilimo</li>
                  <li>⫸ Pata malipo kwa huduma zako</li>
                  <li>⫸ Kuwa sehemu ya jamii ya wataalamu</li>
                </ul>
              )}
            </div>
            <div className="selection-indicator">
              <i className="fas fa-check"></i>
            </div>
          </div>
        ))}
      </div>

      <div className="step-actions">
        <button 
          type="button"
          className="btn btn-primary"
          disabled={!userType}
          onClick={handleNext}
        >
          Endelea <i className="fas fa-arrow-right"></i>
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="registration-step">
      <div className="step-header">
        <div className="step-number">2</div>
        <div className="step-info">
          <h2>Taarifa za Msingi</h2>
          <p>Jaza taarifa zako za msingi. Taarifa hizi zitasaidia wakulima/wanunuzi kukupata na kukuwasiliana.</p>
        </div>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="fullName">Jina Kamili *</label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            required
            className={`form-control ${errors.fullName ? 'error' : ''}`}
            placeholder="Weka jina lako kamili"
            disabled={isLoading}
          />
          {errors.fullName && <div className="error-message">{errors.fullName}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="email">Barua Pepe *</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            className={`form-control ${errors.email ? 'error' : ''}`}
            placeholder="barua@example.com"
            disabled={isLoading}
          />
          {errors.email && <div className="error-message">{errors.email}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="phone">Namba ya Simu *</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            required
            className={`form-control ${errors.phone ? 'error' : ''}`}
            placeholder="+255 XXX XXX XXX"
            disabled={isLoading}
          />
          {errors.phone && <div className="error-message">{errors.phone}</div>}
          <small className="form-hint">Tutatumia namba hii kwa mawasiliano muhimu</small>
        </div>

        <div className="form-group">
          <label htmlFor="password">Nenosiri *</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            required
            className={`form-control ${errors.password ? 'error' : ''}`}
            placeholder="Weka nenosiri lenye herufi 8 au zaidi"
            minLength="8"
            disabled={isLoading}
          />
          {errors.password && <div className="error-message">{errors.password}</div>}
          <small className="form-hint">Angalau herufi 8, yenye namba na herufi</small>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Thibitisha Nenosiri *</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            required
            className={`form-control ${errors.confirmPassword ? 'error' : ''}`}
            placeholder="Weka nenosiri tena"
            disabled={isLoading}
          />
          {errors.confirmPassword && <div className="error-message">{errors.confirmPassword}</div>}
        </div>
      </div>

      {/* User Type Specific Fields */}
      {userType === 'farmer' && (
        <div className="user-specific-fields">
          <h3>📋 Taarifa za Kilimo</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="farmSize">Ukubwa wa Shamba</label>
              <input
                type="text"
                id="farmSize"
                name="farmSize"
                value={formData.farmSize}
                onChange={handleInputChange}
                className="form-control"
                placeholder="Mf. Ekari 5, Hekta 2"
                disabled={isLoading}
              />
              <small className="form-hint">Ukubwa wa shamba lako (si lazima)</small>
            </div>

            <div className="form-group">
              <label htmlFor="farmLocation">Eneo la Shamba</label>
              <input
                type="text"
                id="farmLocation"
                name="farmLocation"
                value={formData.farmLocation}
                onChange={handleInputChange}
                className="form-control"
                placeholder="Kijiji, Kata au Eneo la shamba"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Mazao Unayolima (Chagua zote zinazofaa)</label>
            <div className="crops-grid">
              {cropsList.map(crop => (
                <label key={crop} className="crop-checkbox">
                  <input
                    type="checkbox"
                    value={crop}
                    checked={formData.crops.includes(crop)}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                  <span className="checkmark"></span>
                  {crop}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {userType === 'buyer' && (
        <div className="user-specific-fields">
          <h3>🏪 Taarifa za Biashara</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="businessType">Aina ya Biashara</label>
              <select
                id="businessType"
                name="businessType"
                value={formData.businessType}
                onChange={handleInputChange}
                className="form-control"
                disabled={isLoading}
              >
                <option value="">Chagua aina ya biashara</option>
                {businessTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="businessLocation">Eneo la Biashara</label>
              <input
                type="text"
                id="businessLocation"
                name="businessLocation"
                value={formData.businessLocation}
                onChange={handleInputChange}
                className="form-control"
                placeholder="Mji, Mtaa, Jina la duka"
                disabled={isLoading}
              />
            </div>
          </div>
          
          <div className="buyer-benefits">
            <h4>✅ Faida za Kujiandikisha kama Mnunuzi:</h4>
            <ul>
              <li>Pata mazao moja kwa moja kutoka kwa wakulima</li>
              <li>Punguza gharama za wapatanishi</li>
              <li>Angalia ubora wa mazao kabla ya kununua</li>
              <li>Wasiliana na wakulima kwa urahisi</li>
            </ul>
          </div>
        </div>
      )}

      {userType === 'expert' && (
        <div className="user-specific-fields">
          <h3>🎓 Taarifa za Utaalamu</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="expertise">Eneo la Utaalamu *</label>
              <select
                id="expertise"
                name="expertise"
                value={formData.expertise}
                onChange={handleInputChange}
                className="form-control"
                required
                disabled={isLoading}
              >
                <option value="">Chagua eneo la utaalamu</option>
                {expertiseAreas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="experience">Uzoefu (Miaka) *</label>
              <input
                type="number"
                id="experience"
                name="experience"
                value={formData.experience}
                onChange={handleInputChange}
                className="form-control"
                placeholder="Mf. 5"
                min="0"
                required
                disabled={isLoading}
              />
            </div>
          </div>
          
          <div className="expert-benefits">
            <h4>✅ Faida za Kujiandikisha kama Mtaalamu:</h4>
            <ul>
              <li>Toa ushauri kwa wakulima na upate malipo</li>
              <li>Andika makala za kilimo na ujenge sifa</li>
              <li>Shiriki ujuzi wako na jamii ya wakulima</li>
              <li>Pata fursa za kufanya mafunzo na semina</li>
            </ul>
          </div>
        </div>
      )}

      <div className="step-actions">
        <button 
          type="button"
          className="btn btn-outline"
          onClick={handleBack}
          disabled={isLoading}
        >
          <i className="fas fa-arrow-left"></i> Nyuma
        </button>
        <button 
          type="button"
          className="btn btn-primary"
          onClick={handleNext}
          disabled={isLoading}
        >
          Endelea <i className="fas fa-arrow-right"></i>
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="registration-step">
      <div className="step-header">
        <div className="step-number">3</div>
        <div className="step-info">
          <h2>Taarifa za Ziada</h2>
          <p>Jaza taarifa zingine muhimu kukukusaidia kupata huduma bora zaidi.</p>
        </div>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="district">Wilaya *</label>
          <select
            id="district"
            name="district"
            value={formData.district}
            onChange={handleInputChange}
            required
            className={`form-control ${errors.district ? 'error' : ''}`}
            disabled={isLoading}
          >
            <option value="">Chagua Wilaya</option>
            {districts.map(district => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>
          {errors.district && <div className="error-message">{errors.district}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="ward">Kata *</label>
          <select
            id="ward"
            name="ward"
            value={formData.ward}
            onChange={handleInputChange}
            required
            className={`form-control ${errors.ward ? 'error' : ''}`}
            disabled={isLoading}
          >
            <option value="">Chagua Kata</option>
            {wards.map(ward => (
              <option key={ward} value={ward}>{ward}</option>
            ))}
          </select>
          {errors.ward && <div className="error-message">{errors.ward}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="village">Kijiji *</label>
          <select
            id="village"
            name="village"
            value={formData.village}
            onChange={handleInputChange}
            required
            className={`form-control ${errors.village ? 'error' : ''}`}
            disabled={isLoading}
          >
            <option value="">Chagua Kijiji</option>
            {villages.map(village => (
              <option key={village} value={village}>{village}</option>
            ))}
          </select>
          {errors.village && <div className="error-message">{errors.village}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="idNumber">Namba ya Kitambulisho</label>
          <input
            type="text"
            id="idNumber"
            name="idNumber"
            value={formData.idNumber}
            onChange={handleInputChange}
            className="form-control"
            placeholder="Namba ya NIDA/Kitambulisho"
            disabled={isLoading}
          />
          <small className="form-hint">Itasaidia kuthibitisha utambulisho wako</small>
        </div>

        <div className="form-group">
          <label htmlFor="dateOfBirth">Tarehe ya Kuzaliwa</label>
          <input
            type="date"
            id="dateOfBirth"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleInputChange}
            className="form-control"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* User Type Summary */}
      <div className="user-summary">
        <h3>📊 Muhtasari wa Akaunti Yako</h3>
        <div className="summary-content">
          <div className="summary-item">
            <strong>Aina ya Akaunti:</strong>
            <span className={`user-type-badge ${userType}`}>
              {userType === 'farmer' && '👨‍🌾 Mkulima'}
              {userType === 'buyer' && '🛒 Mnunuzi'}
              {userType === 'expert' && '🎓 Mtaalamu'}
            </span>
          </div>
          <div className="summary-item">
            <strong>Jina:</strong> {formData.fullName}
          </div>
          <div className="summary-item">
            <strong>Barua Pepe:</strong> {formData.email}
          </div>
          <div className="summary-item">
            <strong>Simu:</strong> {formData.phone}
          </div>
          <div className="summary-item">
            <strong>Eneo:</strong> {formData.district} - {formData.ward} - {formData.village}
          </div>
          
          {userType === 'farmer' && (
            <>
              <div className="summary-item">
                <strong>Ukubwa wa Shamba:</strong> {formData.farmSize || 'Haijajazwa'}
              </div>
              <div className="summary-item">
                <strong>Mazao:</strong> {formData.crops.length > 0 ? formData.crops.join(', ') : 'Bado haijachaguliwa'}
              </div>
            </>
          )}
          
          {userType === 'buyer' && (
            <>
              <div className="summary-item">
                <strong>Aina ya Biashara:</strong> {formData.businessType || 'Haijajazwa'}
              </div>
            </>
          )}
          
          {userType === 'expert' && (
            <>
              <div className="summary-item">
                <strong>Utaalamu:</strong> {formData.expertise || 'Haijajazwa'}
              </div>
              <div className="summary-item">
                <strong>Uzoefu:</strong> {formData.experience ? `${formData.experience} miaka` : 'Haijajazwa'}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="terms-section">
        <label className="terms-checkbox">
          <input 
            type="checkbox" 
            required 
            disabled={isLoading}
          />
          <span className="checkmark"></span>
          <div className="terms-text">
            Nakubali <a href="#" onClick={(e) => e.preventDefault()}>Sheria na Masharti</a> ya kutumia jukwaa la Katavi E-Kilimo.
            Naelewa kuwa taarifa zangu zitatumika kwa madhumuni ya kuwezesha biashara na mawasiliano kwenye jukwaa.
          </div>
        </label>
      </div>

      <div className="step-actions">
        <button 
          type="button"
          className="btn btn-outline"
          onClick={handleBack}
          disabled={isLoading}
        >
          <i className="fas fa-arrow-left"></i> Nyuma
        </button>
        <button 
          type="submit"
          className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <i className="fas fa-spinner fa-spin"></i>
              Inasajili...
            </>
          ) : (
            <>
              <i className="fas fa-user-plus"></i>
              Kamilisha Usajili
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="page registration-page">
      <Navigation 
        currentPage="registration"
        onPageChange={onPageChange}
        onAuth={onAuth}
        user={user}
      />
      
      <div className="registration-container">
        <div className="container">
          <div className="registration-content">
            {/* Progress Bar */}
            <div className="progress-bar">
              <div className="progress-steps">
                <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
                  <div className="step-circle">1</div>
                  <span className="step-label">Aina ya Akaunti</span>
                </div>
                <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
                  <div className="step-circle">2</div>
                  <span className="step-label">Taarifa za Msingi</span>
                </div>
                <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>
                  <div className="step-circle">3</div>
                  <span className="step-label">Taarifa za Ziada</span>
                </div>
              </div>
              <div className="progress-line">
                <div 
                  className="progress-fill"
                  style={{ width: `${((step - 1) / 2) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Error Display */}
            {errors.general && (
              <div className="alert alert-error">
                <i className="fas fa-exclamation-circle"></i>
                {errors.general}
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="registration-form">
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
            </form>

            {/* Login Prompt */}
            <div className="login-prompt">
              <p>Tayari una akaunti? 
                <button 
                  onClick={() => navigate('/login')}
                  className="login-link"
                  disabled={isLoading}
                >
                  Ingia hapa
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer onPageChange={onPageChange} />
    </div>
  );
};

export default Registration;