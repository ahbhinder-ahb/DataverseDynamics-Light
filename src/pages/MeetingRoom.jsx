import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CalendarClock, ExternalLink, Home, Loader2, ShieldAlert } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useSEO } from '@/hooks/useSEO';
import { seoMetadata } from '@/config/seoMetadata';
import { supabase } from '@/lib/customSupabaseClient';

const MeetingRoom = () => {
  const navigate = useNavigate();
  const { bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const source = searchParams.get('source') || 'client';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(null);
  const [canJoin, setCanJoin] = useState(false);
  const [joining, setJoining] = useState(false);

  useSEO(seoMetadata['/meeting-room']);

  // Construct the redirect base URL for the Supabase Edge Function
  const redirectBase = useMemo(() => {
    // Accessing the Supabase URL via the client's internal configuration
    const supabaseUrl = supabase.supabaseUrl;
    return `${supabaseUrl}/functions/v1/redirect-to-meet`;
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const runCheck = async () => {
      if (!bookingId) {
        setError('Invalid meeting link. Missing booking id.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${redirectBase}?id=${encodeURIComponent(bookingId)}&check=1`);

        if (!response.ok) {
          setError('Unable to validate this meeting right now. Please try again.');
          setLoading(false);
          return;
        }

        const result = await response.json();

        setBooking(result.booking || null);
        setCanJoin(Boolean(result.can_join));

        if (!result.can_join) {
          if (result.reason === 'not_confirmed') {
            setError('This meeting is not confirmed yet. Please use the confirmation link in your email first.');
          } else if (result.reason === 'cancelled') {
            setError('This meeting has been cancelled and cannot be joined.');
          } else if (result.reason === 'booking_not_found') {
            setError('Meeting not found. Please check your link or contact support.');
          } else {
            setError('This meeting is currently unavailable. Please contact support.');
          }
        }
      } catch (err) {
        console.error('Meeting room validation failed:', err);
        setError('Unable to validate this meeting right now. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    runCheck();
  }, [bookingId, redirectBase]);

  const handleJoin = () => {
    if (!canJoin || !bookingId) return;

    setJoining(true);
    const joinUrl = `${redirectBase}?id=${encodeURIComponent(bookingId)}`;

    // Open in new tab for both admin and client
    window.open(joinUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => setJoining(false), 1200);
  };

  const meetingDateLabel = booking?.preferred_date
    ? new Date(`${booking.preferred_date}T00:00:00`).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';

  const meetingTimeLabel = booking?.preferred_time
    ? booking.preferred_time
    : 'N/A';

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Header />
      <main className="flex-grow flex items-center justify-center relative overflow-hidden py-28 px-4">
        <div className="absolute inset-0 z-0">
          <div className="absolute -top-20 right-8 w-80 h-80 bg-blue-500/5 rounded-full blur-[110px]" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-500/5 rounded-full blur-[110px]" />
        </div>

        <div className="relative z-10 max-w-2xl w-full rounded-2xl border border-blue-200 bg-blue-50 backdrop-blur p-6 md:p-8 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-blue-600">Meeting Room</p>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2">Pre-Join Check</h1>
              <p className="text-slate-700 mt-2">We verify your booking status before opening Google Meet.</p>
            </div>
            <div className="h-11 w-11 rounded-full bg-blue-500/15 border border-blue-300 flex items-center justify-center">
              <CalendarClock className="h-5 w-5 text-blue-600" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl border border-blue-200 bg-white p-4">
              <p className="text-slate-700">Meeting Date</p>
              <p className="text-slate-900 mt-1 font-semibold">{meetingDateLabel}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-white p-4">
              <p className="text-slate-700">Meeting Time</p>
              <p className="text-slate-900 mt-1 font-semibold">{meetingTimeLabel}</p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 flex items-center gap-3 text-slate-900">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              Validating booking status...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-orange-300 bg-orange-50 p-5 flex items-start gap-3 text-orange-900">
              <ShieldAlert className="h-5 w-5 mt-0.5 text-orange-600" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="rounded-xl border border-green-300 bg-green-50 p-5 text-green-900">
              Booking is confirmed. You can join the meeting now.
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={!canJoin || loading || joining}
              onClick={handleJoin}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-6 text-lg font-semibold rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {joining ? (source === 'admin' ? 'Loading meeting...' : 'Opening Meet...') : 'Join Meeting'}
              <ExternalLink className="h-5 w-5 ml-2" />
            </Button>

            <Button
              type="button"
              onClick={() => {
                if (source === 'admin') {
                  navigate('/admin');
                } else {
                  navigate('/');
                }
              }}
              size="lg"
              className="bg-gradient-to-r from-slate-300 to-slate-400 hover:from-slate-400 hover:to-slate-500 text-slate-900 px-8 py-6 text-lg font-semibold rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              <Home className="h-5 w-5 mr-2" />
              {source === 'admin' ? 'Back to Admin' : 'Back to Home'}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MeetingRoom;