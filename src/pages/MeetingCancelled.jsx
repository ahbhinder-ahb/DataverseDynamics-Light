import React, { useEffect } from 'react';
import { XCircle, CalendarX2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useSEO } from '@/hooks/useSEO';
import { seoMetadata } from '@/config/seoMetadata';

const MeetingCancelled = () => {
  const navigate = useNavigate();
  const location = useLocation();
  useSEO(seoMetadata["/meeting-cancelled"]);

  const isAlreadyCancelled = new URLSearchParams(location.search).get('status') === 'already';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Header />
      <main className="flex-grow flex items-center justify-center relative overflow-hidden py-32 px-4">
        <div className="absolute inset-0 z-0">
          <div className="absolute -top-24 left-10 w-80 h-80 bg-rose-500/5 rounded-full blur-[110px]" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-500/5 rounded-full blur-[110px]" />
        </div>

        <div className="relative z-10 max-w-xl w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-20 w-20 bg-rose-500/15 rounded-full flex items-center justify-center">
              <XCircle className="h-10 w-10 text-rose-600" />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
              {isAlreadyCancelled ? 'Already Cancelled' : 'Meeting Cancelled'}
            </h1>
            <p className="text-lg text-slate-700">
              {isAlreadyCancelled
                ? 'This meeting was already cancelled. If you need a new slot, you can book again.'
                : 'Your meeting has been cancelled. If you want to book a new time, you can do it from our home page.'}
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => navigate('/')}
              size="lg"
              className="bg-white text-slate-900 hover:bg-slate-200 font-bold px-8 h-12 inline-flex items-center gap-2"
            >
              <CalendarX2 size={18} />
              Book a New Time
            </Button>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              size="lg"
              className="border-blue-300 text-slate-900 hover:bg-blue-50 hover:text-slate-900 font-bold px-8 h-12"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MeetingCancelled;