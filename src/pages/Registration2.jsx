import React, { useState } from 'react';
import Header from '../components/Header/Header';
import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import FloatingContact from '../components/FloatingContact/FloatingContact';
import './CSS/Registration.css';

const Registration2 = () => {
  const [formData, setFormData] = useState({
    name: '',
    course: '',
    phone: '',
    email: '',
    gender: 'Male',
    yearOfStudy: 'Year 1',
    department: 'Nyingine',
    status: 'active',
    baptismStatus: 'Sijabatizwa',
    homeChurch: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [apiError, setApiError] = useState('');

  const API_URL = 'https://uscftakwimu-11.onrender.com/api/members';

  const courses = [
    'Bachelor Degree in Official Statistics',
    'Bachelor Degree in Business Statistics and Economics',
    'Bachelor Degree in Agriculture Statistics and Economics',
    'Bachelor Degree in Data Science',
    'Bachelor Degree in Actuarial Statistics',
    'Basic Technician Certificate in Statistics',
    'Basic Technician Certificate in Information Technology',
    'Ordinary Diploma in Statistics',
    'Ordinary Diploma in Information Technology',
    'Nyingine'
  ];

  const baptismStatuses = [
    'Nimebatizwa',
    'Sijabatizwa',
  ];

  const years = ['Year 1', 'Year 2', 'Year 3', 'Graduated'];
  const departments = ['Kwaya', 'Uinjilisti', 'Maombi', 'IT', 'Drama Ministry','Nyingine'];
  const genders = ['Male', 'Female'];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
    
    if (apiError) {
      setApiError('');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Jina kamili linahitajika';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Jina lazima liwe na herufi zaidi ya 2';
    }

    if (!formData.course.trim()) {
      newErrors.course = 'Kozi inahitajika';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Namba ya simu inahitajika';
    } else if (!/^(\+255|0)[0-9]{9}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Tafadhali weka namba sahihi (anza na +255 au 0)';
    }

    if (!formData.gender) {
      newErrors.gender = 'Jinsia inahitajika';
    }

    if (!formData.yearOfStudy) {
      newErrors.yearOfStudy = 'Mwaka wa masomo unahitajika';
    }

    if (!formData.department) {
      newErrors.department = 'Idara inahitajika';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setApiError('');

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      console.log('Church member registration success:', data);

      setIsSubmitting(false);
      setShowSuccess(true);
      
      setTimeout(() => {
        setFormData({
          name: '',
          course: '',
          phone: '',
          email: '',
          gender: 'Male',
          yearOfStudy: 'Year 1',
          department: 'Nyingine',
          status: 'active',
          baptismStatus: 'Sijabatizwa',
          homeChurch: ''
        });
        setShowSuccess(false);
      }, 5000);

    } catch (error) {
      console.error('Church member registration error:', error);
      setIsSubmitting(false);
      setApiError(error.message || 'Hitilafu ya mtandao. Tafadhali jaribu tena.');
    }
  };

  if (showSuccess) {
    return (
      <div className="registration-page">
        <Header />
        <Navbar />
        
        <main>
          <div className="registration-hero church-hero">
            <div className="container">
              <h1>WELCOME TO USCF TAKWIMU</h1>
              <p className="tagline">#WE SERVE THE LIVING GOD</p>
            </div>
          </div>

          <div className="container">
            <div className="success-container">
              <div className="success-animation">
                <div className="success-icon">
                  <i className="ri-team-fill"></i>
                </div>
                <h2>Karibu Katika Familia ya USCF!</h2>
                <p>Usajili wako umekamilika. Karibu katika jumuiya yetu ya Kikristo.</p>
                <div className="success-details">
                  <p><strong>Jina:</strong> {formData.name}</p>
                  <p><strong>Namba ya simu:</strong> {formData.phone}</p>
                  <p><strong>Kozi:</strong> {formData.course}</p>
                  <p><strong>Namba ya Usajili:</strong> #C{Math.random().toString(36).substr(2, 6).toUpperCase()}</p>
                </div>
                <div className="welcome-message">
                  <p>Tutawasiliana nawe kuhibu hatua za kujiunga na shughuli zetu za kanisa.</p>
                </div>
                <div className="success-actions">
                  <button 
                    className="back-to-form-btn"
                    onClick={() => setShowSuccess(false)}
                  >
                    <i className="ri-arrow-left-line"></i>
                    Sajili Mwingine
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer />
        <FloatingContact />
      </div>
    );
  }

  return (
    <div className="registration-page">
      <Header />
      <Navbar />
      
      <main>
        <div className="registration-hero church-hero">
          <div className="container">
            <div className="hero-content">
              <h1>WELCOME TO USCF TAKWIMU</h1>
              <p className="tagline">#WE SERVE THE LIVING GOD</p>
              <div className="hero-stats">
                <div className="stat">
                  <i className="ri-team-line"></i>
                  <span>86+ Wanachama</span>
                </div>
                <div className="stat">
                  <i className="ri-calendar-check-line"></i>
                  <span>5+ Miaka ya Huduma</span>
                </div>
                <div className="stat">
                  <i className="ri-heart-line"></i>
                  <span>Jumuiya ya Upendo</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container">
          <div className="registration-section">
            <div className="form-container church-form">
              <h2 className="form-title">Usajili wa Kujiunga na USCF</h2>
              <p className="form-subtitle">Jiunge na jumuiya yetu ya Kikristo na ufurahie ushirika, mafundisho, na huduma</p>
              
              {apiError && (
                <div className="api-error">
                  <i className="ri-error-warning-line"></i>
                  {apiError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="registration-form">
                <div className="form-group">
                  <label htmlFor="name">Jina Kamili</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Weka jina lako kamili"
                    className={errors.name ? 'error' : ''}
                  />
                  {errors.name && <span className="error-message">{errors.name}</span>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="course">Kozi Unayosoma</label>
                    <select
                      id="course"
                      name="course"
                      value={formData.course}
                      onChange={handleInputChange}
                      className={errors.course ? 'error' : ''}
                    >
                      <option value="">Chagua kozi yako</option>
                      {courses.map((course, index) => (
                        <option key={index} value={course}>{course}</option>
                      ))}
                    </select>
                    {errors.course && <span className="error-message">{errors.course}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="yearOfStudy">Mwaka wa Masomo</label>
                    <select
                      id="yearOfStudy"
                      name="yearOfStudy"
                      value={formData.yearOfStudy}
                      onChange={handleInputChange}
                      className={errors.yearOfStudy ? 'error' : ''}
                    >
                      <option value="">Chagua mwaka</option>
                      {years.map((year, index) => (
                        <option key={index} value={year}>{year}</option>
                      ))}
                    </select>
                    {errors.yearOfStudy && <span className="error-message">{errors.yearOfStudy}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="phone">Namba ya Simu</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+255 XXX XXX XXX"
                      className={errors.phone ? 'error' : ''}
                    />
                    {errors.phone && <span className="error-message">{errors.phone}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="gender">Jinsia</label>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className={errors.gender ? 'error' : ''}
                    >
                      <option value="">Chagua jinsia</option>
                      {genders.map((gender, index) => (
                        <option key={index} value={gender}>{gender}</option>
                      ))}
                    </select>
                    {errors.gender && <span className="error-message">{errors.gender}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="department">Idara ya Huduma</label>
                  <select
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className={errors.department ? 'error' : ''}
                  >
                    <option value="">Chagua idara</option>
                    {departments.map((dept, index) => (
                      <option key={index} value={dept}>{dept}</option>
                    ))}
                  </select>
                  {errors.department && <span className="error-message">{errors.department}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="email">Barua Pepe (Si lazima)</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="barua@example.com"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="baptismStatus">Hali ya Ubatizo</label>
                    <select
                      id="baptismStatus"
                      name="baptismStatus"
                      value={formData.baptismStatus}
                      onChange={handleInputChange}
                    >
                      {baptismStatuses.map((status, index) => (
                        <option key={index} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="homeChurch">Kanisa la Nyumbani (Si lazima)</label>
                    <input
                      type="text"
                      id="homeChurch"
                      name="homeChurch"
                      value={formData.homeChurch}
                      onChange={handleInputChange}
                      placeholder="Jina la kanisa lako la nyumbani"
                    />
                  </div>
                </div>

                <button type="submit" className="submit-btn church-btn" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <i className="ri-loader-4-line spin"></i>
                      Inasajili...
                    </>
                  ) : (
                    <>
                      <i className="ri-user-add-line"></i>
                      Jisajili Sasa
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="registration-info">
              <div className="info-card church-info">
                <h3>Karibu Katika USCF TAKWIMU</h3>
                <p>USCF CCT TAKWIMU ni jumuiya ya wanafunzi wa Kikristo inayolenga kuimarisha imani na kutoa huduma kwa jamii.</p>
                
                <div className="membership-benefits">
                  <h4>Faida za Uanachama:</h4>
                  <div className="benefit-item">
                    <i className="ri-team-line"></i>
                    <div>
                      <h5>Ushirika na Jumuiya</h5>
                      <p>Pata marafiki wapya na ushirika wa Kikristo</p>
                    </div>
                  </div>
                  <div className="benefit-item">
                    <i className="ri-book-line"></i>
                    <div>
                      <h5>Mafundisho ya Kiroho</h5>
                      <p>Kukuza na kuimarisha imani yako ya Kikristo</p>
                    </div>
                  </div>
                  <div className="benefit-item">
                    <i className="ri-service-line"></i>
                    <div>
                      <h5>Huduma za Kijamii</h5>
                      <p>Shiriki katika misheni na huduma za jamii</p>
                    </div>
                  </div>
                </div>

                <div className="quick-contact">
                  <h4>Haraka Wasiliana:</h4>
                  <div className="contact-item">
                    <i className="ri-phone-line"></i>
                    <span>+255 755 327 135</span>
                  </div>
                  <div className="contact-item">
                    <i className="ri-mail-line"></i>
                    <span>uscftakwimu@gmail.com</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <FloatingContact />
    </div>
  );
};

export default Registration2;