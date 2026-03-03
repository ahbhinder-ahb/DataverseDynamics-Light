import React, { useEffect } from 'react';
import { AlertTriangle, Home } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useSEO } from '@/hooks/useSEO';
import { seoMetadata } from '@/config/seoMetadata';

const MeetingError = () => {
  const navigate = useNavigate();
  const location = useLocation();
  useSEO(seoMetadata["/meeting-error"]);

  const status = new URLSearchParams(location.search).get('status');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Header />
      <main className="flex-grow flex items-center justify-center relative overflow-hidden py-32 px-4">
        <div className="absolute inset-0 z-0">
          <div className="absolute -top-24 right-10 w-80 h-80 bg-amber-500/5 rounded-full blur-[110px]" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-500/5 rounded-full blur-[110px]" />
        </div>

        <div className="relative z-10 max-w-xl w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-20 w-20 bg-amber-500/15 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-10 w-10 text-amber-600" />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
              Link Error
            </h1>
            <p className="text-lg text-slate-700">
              {status === 'not-confirmed'
                ? 'This meeting is not confirmed yet. Please use your confirmation link first.'
                : 'This confirmation link is invalid or has already been used. Please contact us if you need help.'}
            </p>
          </div>

          <div className="pt-4">
            <Button
              onClick={() => navigate('/')}
              size="lg"
              className="bg-white text-slate-900 hover:bg-slate-200 font-bold px-8 h-12 inline-flex items-center gap-2"
            >
              <Home size={18} />
              Back to Home
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MeetingError;
