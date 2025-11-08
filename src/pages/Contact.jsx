import React, { useState } from 'react';
import Navigation from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import './CSS/Contact.css';

const Contact = ({ onPageChange, onAuth, user }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const [activeTab, setActiveTab] = useState('general');

  const contactMethods = [
    {
      type: 'phone',
      icon: 'fas fa-phone',
      title: 'Simu',
      details: ['+255 123 456 789', '+255 987 654 321'],
      description: 'Tupigie simu kwa maswali yoyote'
    },
    {
      type: 'email',
      icon: 'fas fa-envelope',
      title: 'Barua Pepe',
      details: ['info@ekilimokatavi.go.tz', 'support@ekilimokatavi.go.tz'],
      description: 'Tutumie barua pepe kwa maswali yako'
    },
    {
      type: 'location',
      icon: 'fas fa-map-marker-alt',
      title: 'Ofisi',
      details: ['S.L.P 1234, Mpanda', 'Mkoa wa Katavi, Tanzania'],
      description: 'Tembelea ofisi zetu kwa usaidizi wa moja kwa moja'
    },
    {
      type: 'hours',
      icon: 'fas fa-clock',
      title: 'Masaa ya Huduma',
      details: ['Jumatatu - Ijumaa: 08:00 - 17:00', 'Jumamosi: 09:00 - 14:00'],
      description: 'Tupo tayari kukusikiliza'
    }
  ];

  const inquiryTypes = [
    { value: 'general', label: 'Maswali ya Jumla' },
    { value: 'technical', label: 'Matatizo ya Kiteknolojia' },
    { value: 'market', label: 'Masoko na Mauzo' },
    { value: 'farming', label: 'Ushauri wa Kilimo' },
    { value: 'partnership', label: 'Ushirikiano' }
  ];

  const regionalOffices = [
    {
      location: 'Mpanda',
      phone: '+255 789 123 456',
      address: 'S.L.P 1234, Mpanda Mjini',
      hours: '08:00 - 17:00 (Jumatatu - Ijumaa)'
    },
    {
      location: 'Mlele',
      phone: '+255 789 234 567',
      address: 'S.L.P 5678, Mlele',
      hours: '08:00 - 17:00 (Jumatatu - Ijumaa)'
    },
    {
      location: 'Nsimbo',
      phone: '+255 789 345 678',
      address: 'S.L.P 9012, Nsimbo',
      hours: '08:00 - 16:00 (Jumatatu - Ijumaa)'
    }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
    alert(`Asante ${formData.name}! Ujumbe wako umetumwa. Tutawasiliana nawe ndani ya masaa 24.`);
    setFormData({
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: ''
    });
  };

  return (
    <div className="page contact-page">
      <Navigation 
        currentPage="contact"
        onPageChange={onPageChange}
        onAuth={onAuth}
        user={user}
      />
      
      <div className="contact-container">
        <div className="container">
          {/* Header */}
          <div className="contact-header">
            <h1>Wasiliana Nasi</h1>
            <p>Tupo tayari kukusikiliza na kukusaidia kwa maswali yoyote kuhusu jukwaa letu la E-Kilimo</p>
          </div>

          <div className="contact-content">
            {/* Contact Methods */}
            <div className="contact-methods">
              <h2>Njia za Kuwasiliana</h2>
              <div className="methods-grid">
                {contactMethods.map(method => (
                  <div key={method.type} className="method-card">
                    <div className="method-icon">
                      <i className={method.icon}></i>
                    </div>
                    <div className="method-content">
                      <h3>{method.title}</h3>
                      <p className="method-description">{method.description}</p>
                      {method.details.map((detail, index) => (
                        <div key={index} className="method-detail">{detail}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Form */}
            <div className="contact-form-section">
              <h2>Tuma Ujumbe</h2>
              
              {/* Inquiry Type Tabs */}
              <div className="inquiry-tabs">
                {inquiryTypes.map(type => (
                  <button
                    key={type.value}
                    className={`tab-btn ${activeTab === type.value ? 'active' : ''}`}
                    onClick={() => setActiveTab(type.value)}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="contact-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name">Jina Kamili *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="form-control"
                    />
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
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="phone">Namba ya Simu *</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="subject">Mada *</label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required
                      className="form-control"
                      placeholder={`Mada kuhusu ${inquiryTypes.find(t => t.value === activeTab)?.label}`}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="message">Ujumbe Wako *</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    rows="6"
                    className="form-control"
                    placeholder="Andika ujumbe wako hapa..."
                  ></textarea>
                </div>

                <button type="submit" className="btn btn-primary btn-lg">
                  <i className="fas fa-paper-plane"></i> Tuma Ujumbe
                </button>
              </form>
            </div>

            {/* Regional Offices */}
            <div className="regional-offices">
              <h2>Ofisi za Kieneo</h2>
              <div className="offices-grid">
                {regionalOffices.map(office => (
                  <div key={office.location} className="office-card">
                    <h3>Ofisi ya {office.location}</h3>
                    <div className="office-details">
                      <div className="office-detail">
                        <i className="fas fa-phone"></i>
                        <span>{office.phone}</span>
                      </div>
                      <div className="office-detail">
                        <i className="fas fa-map-marker-alt"></i>
                        <span>{office.address}</span>
                      </div>
                      <div className="office-detail">
                        <i className="fas fa-clock"></i>
                        <span>{office.hours}</span>
                      </div>
                    </div>
                    <button className="btn btn-outline btn-sm">
                      <i className="fas fa-directions"></i> Onyesha Njia
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ Section */}
            <div className="faq-section">
              <h2>Maswali Yanayoulizwa Mara Kwa Mara</h2>
              <div className="faq-grid">
                <div className="faq-item">
                  <h3>Je, nawezaje kujiunga kama mkulima?</h3>
                  <p>Bofya kitufe cha "Jisajili" juu ukichague "Mkulima". Utahitaji kujaza fomu na kutoa taarifa kuhusu shamba lako na mazao unayolima.</p>
                </div>
                <div className="faq-item">
                  <h3>Mazao yangu yanaweza kuuzwa wapi?</h3>
                  <p>Mazao yako yataonekana kwenye soko la mtandaoni na wanunuzi wanaweza kukuona na kuwasiliana nawe moja kwa moja.</p>
                </div>
                <div className="faq-item">
                  <h3>Je, kuna malipo ya kujiunga?</h3>
                  <p>Hakuna malipo ya kujiunga kwa wakulima. Mfumo unatumika bure ili kuwasaidia wakulima kufikia soko.</p>
                </div>
                <div className="faq-item">
                  <h3>Nawezaje kupata ushauri wa kilimo?</h3>
                  <p>Tuna wataalamu wa kilimo ambao wanaweza kukupa ushauri kupitia simu, ujumbe, au mkutano wa moja kwa moja.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer onPageChange={onPageChange} />
    </div>
  );
};

export default Contact;