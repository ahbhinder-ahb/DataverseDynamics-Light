
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Services from '@/components/Services';
import HowWeHelp from '@/components/HowWeHelp';
import Industries from '@/components/Industries';
import WhyChooseUs from '@/components/WhyChooseUs';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';
import ChatWidget from '@/components/ChatWidget';
import PWASetup from '@/components/PWASetup';
import AnimatedLinesBackground from '@/components/AnimatedLinesBackground';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import ScrollToTop from '@/components/ScrollToTop';
import { useSEO } from '@/hooks/useSEO';
import { seoMetadata } from '@/config/seoMetadata';

// Page Imports
import BackOfficeOperations from '@/pages/BackOfficeOperations';
import AdvisoryConsulting from '@/pages/AdvisoryConsulting';
import DataReporting from '@/pages/DataReporting';
import ExpansionInfrastructure from '@/pages/ExpansionInfrastructure';
import WebsiteDevelopment from '@/pages/WebsiteDevelopment';
import DigitalMarketingSEO from '@/pages/DigitalMarketingSEO';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsOfService from '@/pages/TermsOfService';
import CookiePolicy from '@/pages/CookiePolicy';
import NotFoundPage from '@/pages/NotFoundPage';
import MeetingConfirmed from '@/pages/MeetingConfirmed';
import MeetingCancelled from '@/pages/MeetingCancelled';
import MeetingError from '@/pages/MeetingError';
import MeetingRoom from '@/pages/MeetingRoom';
import AdminLogin from '@/pages/AdminLogin';
import AdminDashboard from '@/pages/AdminDashboard';

function Home() {
  const location = useLocation();
  
  // Apply SEO for Home Page unconditionally at the top level of the component
  useSEO(seoMetadata["/"]);

  useEffect(() => {
    // Check for anchor param
    const params = new URLSearchParams(location.search);
    const anchor = params.get('anchor');
    
    if (anchor) {
      // Use a slight delay to ensure the DOM is fully ready and layout has settled
      setTimeout(() => {
        const element = document.getElementById(anchor);
        if (element) {
          const headerOffset = 80;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
          });
        }
      }, 500); 
    } else {
        // Only scroll to top if no anchor and not just a hash change
        if (!location.hash) {
            window.scrollTo(0, 0);
        }
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-transparent flex flex-col relative">
      <AnimatedLinesBackground />
      <Header />
      <main className="flex-grow">
        <Hero />
        <Services />
        <HowWeHelp />
        <Industries />
        <WhyChooseUs />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <AuthProvider>
        <ScrollToTop />
        <PWASetup />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/back-office-operations" element={<BackOfficeOperations />} />
          <Route path="/advisory-consulting" element={<AdvisoryConsulting />} />
          <Route path="/data-reporting" element={<DataReporting />} />
          <Route path="/expansion-infrastructure" element={<ExpansionInfrastructure />} />
          <Route path="/website-development" element={<WebsiteDevelopment />} />
          <Route path="/digital-marketing-seo" element={<DigitalMarketingSEO />} />
          
          {/* Policy Pages */}
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />

          {/* Meeting Confirmation Pages */}
          <Route path="/meeting-confirmed" element={<MeetingConfirmed />} />
          <Route path="/meeting-cancelled" element={<MeetingCancelled />} />
          <Route path="/meeting-error" element={<MeetingError />} />
          <Route path="/meeting-room/:bookingId" element={<MeetingRoom />} />
          
          {/* Admin Pages */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />

          {/* Catch-all 404 Route - MUST BE LAST */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        
        <ChatWidget />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
