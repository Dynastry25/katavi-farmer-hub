import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import PublicBanner from './PublicBanner';

const PublicLayout = () => {
  return (
    <div className="public-layout">
      <Navbar />
      <PublicBanner />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default PublicLayout;
