import React, { createContext, useContext, useState, useEffect } from 'react';

const LangContext = createContext(null);

export const useLang = () => {
  const context = useContext(LangContext);
  if (!context) throw new Error('useLang lazima itumike ndani ya LangProvider');
  return context;
};

const translations = {
  sw: {
    home: 'Nyumbani',
    market: 'Soko',
    news: 'Habari',
    weather: 'Hali ya Hewa',
    advice: 'Ushauri',
    inputs: 'Viingilio',
    about: 'Kuhusu',
    contact: 'Mawasiliano',
    login: 'Ingia',
    register: 'Jiandikishe',
    logout: 'Ondoka',
    profile: 'Wasifu',
    dashboard: 'Dashibodi',
    search: 'Tafuta...',
    loading: 'Inapakia...',
    error: 'Hitilafu imetokea',
    save: 'Hifadhi',
    cancel: 'Ghairi',
    delete: 'Futa',
    edit: 'Hariri',
    add: 'Ongeza',
    confirm: 'Thibitisha',
    back: 'Rudi',
    next: 'Endelea',
    yes: 'Ndiyo',
    no: 'Hapana',
    noData: 'Hakuna data',
    success: 'Imefanikiwa',
    failed: 'Imeshindikana',
  },
  en: {
    home: 'Home',
    market: 'Market',
    news: 'News',
    weather: 'Weather',
    advice: 'Advisory',
    inputs: 'Inputs',
    about: 'About',
    contact: 'Contact',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    profile: 'Profile',
    dashboard: 'Dashboard',
    search: 'Search...',
    loading: 'Loading...',
    error: 'An error occurred',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    yes: 'Yes',
    no: 'No',
    noData: 'No data available',
    success: 'Success',
    failed: 'Failed',
  },
};

export const LangProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem('kataviLang') || 'sw');

  useEffect(() => {
    localStorage.setItem('kataviLang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key) => translations[lang]?.[key] || translations.sw[key] || key;

  const toggleLang = () => {
    setLang(prev => prev === 'sw' ? 'en' : 'sw');
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t, toggleLang }}>
      {children}
    </LangContext.Provider>
  );
};

export default LangContext;
