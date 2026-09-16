import React, { useState, useEffect } from 'react';
import './CSS/Partners.css';

const PARTNER_GROUPS = [
  {
    id: 'government',
    label: 'Sekta za Serikali',
    icon: 'fas fa-landmark',
    color: '#166534',
    partners: [
      {
        name: 'TAMISEMI - Katavi',
        description: 'Ofisi ya Mkuu wa Mkoa wa Katavi - mkurugenzi wa kilimo, maendeleo ya vijiji na elimu.',
        type: 'Tawala za Mikoa',
        contact: 'Ofisi ya Mkuu wa Mkoa, Mpanda',
        link: 'https://katavi.go.tz',
        icon: 'fas fa-building',
      },
      {
        name: 'DALDO - Katavi',
        description: 'Dawati la Taifa Kupambana na Umaasivu (kitengo cha kilimo cha wilaya) - ushauri wa kilimo na upandaji.',
        type: 'Serikali',
        contact: 'Wilaya ya Mpanda, Katavi',
        link: 'https://www.kilimo.go.tz',
        icon: 'fas fa-leaf',
      },
      {
        name: 'MAKISWA - Wizara ya Kilimo',
        description: 'Wizara ya Kilimo Tanzania - mifumo ya taarifa za mazao, bei na soko la kitaifa.',
        type: 'Wizara',
        contact: 'Dar es Salaam',
        link: 'https://www.kilimo.go.tz',
        icon: 'fas fa-seedling',
      },
      {
        name: 'Halmashauri ya Mkoa wa Katavi',
        description: 'Taarifa rasmi za mkoa, maendeleo na fursa za ruzuku za kilimo.',
        type: 'Tawala za Mkoa',
        contact: 'Mpanda, Katavi',
        link: 'https://katavi.go.tz',
        icon: 'fas fa-city',
      },
    ],
  },
  {
    id: 'finance',
    label: 'Taasisi za Fedha za Kilimo',
    icon: 'fas fa-university',
    color: '#1d4ed8',
    partners: [
      {
        name: 'TIB Development Bank',
        description: 'Mkopo wa kilimo kwa wakulima wakubwa na wa kati, ununuzi wa vifaa vya kilimo.',
        type: 'Benki ya Maendeleo',
        contact: 'Dar es Salaam & Mpanda',
        link: 'https://www.tib.co.tz',
        icon: 'fas fa-university',
      },
      {
        name: 'Tanzania Agricultural Development Bank (TADB)',
        description: 'Taasisi rasmi ya serikali kwa ajili ya fedha za kilimo, mikopo kwa vikundi vya wakulima.',
        type: 'Benki ya Kilimo',
        contact: 'Dar es Salaam',
        link: 'https://www.tadb.co.tz',
        icon: 'fas fa-coins',
      },
      {
        name: 'SACCOs za Mkoa wa Katavi',
        description: 'Vyama vya ushirika vya mikopo na akiba (SACCOS) katika wilaya za Mpanda, Mlele na Nsimbo.',
        type: 'Ushirika',
        contact: 'Wilaya mbalimbali',
        link: 'https://www.tcc.go.tz',
        icon: 'fas fa-users',
      },
      {
        name: 'CRDB & NMB Mafanikio',
        description: 'Mikopo maalum kwa wakulima na vikundi vya kilimo (Mafanikio Loan).',
        type: 'Benki za Biashara',
        contact: 'Tawi la Mpanda',
        link: 'https://www.crdbbank.co.tz',
        icon: 'fas fa-hand-holding-dollar',
      },
    ],
  },
  {
    id: 'extension',
    label: 'Huduma za Ugani na Ushauri',
    icon: 'fas fa-user-graduate',
    color: '#0369a1',
    partners: [
      {
        name: 'Uyole Agricultural Research Institute',
        description: 'Utafiti wa mazao, mbegu bora na mbinu za kisasa za kilimo kwa nusu-mahali.',
        type: 'Utafiti',
        contact: 'Uyole, Mbeya',
        link: 'https://www.uyole.com',
        icon: 'fas fa-microscope',
      },
      {
        name: 'MARI - Ukiriguru',
        description: 'Mamlaka ya Utafiti wa Kilimo Tanzania (MARI) - mbinu za kilimo mseto.',
        type: 'Utafiti',
        contact: 'Ukiriguru, Mwanza',
        link: 'https://www.mari.go.tz',
        icon: 'fas fa-flask',
      },
      {
        name: 'Training Institutes za Kilimo (FORI)',
        description: 'Mafunzo ya kilimo vijijini kwa wakulima wa mkoa wa Katavi.',
        type: 'Mafunzo',
        contact: 'Mkoa wa Katavi',
        link: 'https://www.kilimo.go.tz',
        icon: 'fas fa-graduation-cap',
      },
    ],
  },
  {
    id: 'ngo',
    label: 'Asasi Zisizo za Kiserikali (NGOs)',
    icon: 'fas fa-handshake',
    color: '#7c3aed',
    partners: [
      {
        name: 'Tanzania Organic Agriculture Movement (TOAM)',
        description: 'Kuendeleza kilimo-hai na mazao asili kwa wakulima wadogo.',
        type: 'NGO ya Kilimo',
        contact: 'Dar es Salaam',
        link: 'https://www.kilimohai.org',
        icon: 'fas fa-recycle',
      },
      {
        name: 'AfricaRice',
        description: 'Utafiti na maendeleo ya kilimo cha mpunga barani Afrika.',
        type: 'Utafiti wa Mpunga',
        contact: 'Nairobi / Dar es Salaam',
        link: 'https://www.africarice.org',
        icon: 'fas fa-wheat-awn',
      },
      {
        name: 'One Acre Fund Tanzania',
        description: 'Msaada wa pembejeo, mafunzo na mikopo ya kilimo kwa wakulima wadogo.',
        type: 'NGO ya Kilimo',
        contact: 'Tanzania',
        link: 'https://oneacrefund.org',
        icon: 'fas fa-tractor',
      },
    ],
  },
  {
    id: 'market',
    label: 'Masoko na Vyama vya Ushirika',
    icon: 'fas fa-store',
    color: '#b45309',
    partners: [
      {
        name: 'Tanzania Coffee Board',
        description: 'Maelezo ya masoko ya kahawa na usajili wa wakulima wa kahawa.',
        type: 'Bodi ya Bidhaa',
        contact: 'Moshi / Dar es Salaam',
        link: 'https://www.coffeeboard.or.tz',
        icon: 'fas fa-mug-hot',
      },
      {
        name: 'Cotton Board (TCD)',
        description: 'Masoko ya pamba, bei za musimu na usajili wa wakulima.',
        type: 'Bodi ya Bidhaa',
        contact: 'Mwanza',
        link: 'https://www.tcd.or.tz',
        icon: 'fas fa-shirt',
      },
      {
        name: 'Tanzania Warehouse Licensing Board',
        description: 'Taarifa za kuhifadhi mazao kwenye maghala na hati za maghala.',
        type: 'Uhifadhi wa Mazao',
        contact: 'Dar es Salaam',
        link: 'https://www.twlb.go.tz',
        icon: 'fas fa-warehouse',
      },
    ],
  },
];

const Partners = () => {
  const [activeGroup, setActiveGroup] = useState('all');

  const groups = activeGroup === 'all' ? PARTNER_GROUPS : PARTNER_GROUPS.filter(g => g.id === activeGroup);

  return (
    <div className="page partners-page">
      <div className="partners-container">
        <div className="container">
          <div className="partners-header">
            <h1>Wadau wa Kilimo</h1>
            <p>Viungo kwa sekta za serikali, asasi, taasisi za fedha na mashirika yanayosaidia wakulima wa Mkoa wa Katavi.</p>
          </div>

          {/* Category filters */}
          <div className="partner-group-filters">
            <button
              className={`partner-group-btn ${activeGroup === 'all' ? 'active' : ''}`}
              onClick={() => setActiveGroup('all')}
            >
              <i className="fas fa-th-large"></i> Wadau Wote
            </button>
            {PARTNER_GROUPS.map(group => (
              <button
                key={group.id}
                className={`partner-group-btn ${activeGroup === group.id ? 'active' : ''}`}
                onClick={() => setActiveGroup(group.id)}
              >
                <i className={group.icon}></i> {group.label}
              </button>
            ))}
          </div>

          {groups.map(group => (
            <div key={group.id} className="partner-section">
              <h2 className="partner-section-title" style={{ color: group.color }}>
                <i className={group.icon}></i> {group.label}
              </h2>
              <div className="partner-grid">
                {group.partners.map((partner, i) => (
                  <a
                    key={i}
                    href={partner.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="partner-card"
                    style={{ borderTopColor: group.color }}
                  >
                    <div className="partner-card-body">
                      <div className="partner-icon" style={{ background: group.color }}>
                        <i className={partner.icon || group.icon}></i>
                      </div>
                      <div className="partner-info">
                        <h3>{partner.name}</h3>
                        <span className="partner-type">{partner.type}</span>
                        <p>{partner.description}</p>
                        <div className="partner-contact">
                          <i className="fas fa-map-marker-alt"></i> {partner.contact}
                        </div>
                      </div>
                    </div>
                    <div className="partner-card-footer">
                      <span className="partner-visit">
                        Tembelea Tovuti <i className="fas fa-external-link-alt"></i>
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}

          <div className="partners-note">
            <i className="fas fa-info-circle"></i>
            <p>
              Viungo hivi ni kwa ajili ya taarifa za ziada tu. Katavi E-Kilimo haihusiki na maudhui ya tovuti za nje.
              Ukiona kiungo ambacho hakifanyi kazi, tafadhali <a href="/contact">wasiliana nasi</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Partners;