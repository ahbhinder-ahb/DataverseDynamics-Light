
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { useSEO } from '@/hooks/useSEO';
import { seoMetadata } from '@/config/seoMetadata';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { user, signIn, loading, errorMessage, clearMessages } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useSEO(seoMetadata['/admin/login']);

  useEffect(() => {
    if (user) {
      navigate('/admin');
    }
  }, [user, navigate]);

  // Clear messages on unmount
  useEffect(() => {
    return () => clearMessages();
  }, [clearMessages]);

  // Detect if running as PWA in standalone mode
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone
      || document.referrer.includes('android-app://');
    setIsStandalone(standalone);
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    const { error } = await signIn(email, password);
    if (!error) {
      navigate('/admin');
    }
    
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
      {!isStandalone && <Header />}
      <main className="flex-grow bg-white text-slate-900 font-display">
        <div className="relative overflow-hidden min-h-screen flex items-center justify-center px-4 py-16">
          <div className="absolute inset-0">
            <div className="absolute -top-40 right-10 h-96 w-96 rounded-full bg-blue-300/10 blur-[140px]" />
            <div className="absolute -bottom-32 left-10 h-96 w-96 rounded-full bg-orange-300/10 blur-[140px]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.05),_transparent_55%)]"/>
          </div>

          <div className="relative z-10 w-full max-w-lg">
            <div className="rounded-3xl border border-blue-200 bg-white p-10 shadow-2xl backdrop-blur">
              <div className="flex items-center gap-3 mb-8">
                <div className="h-12 w-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-blue-600">Admin Access</p>
                  <h1 className="text-3xl font-semibold text-slate-900">Dataverse Control Room</h1>
                </div>
              </div>

              <p className="text-slate-700 mb-8">
                Sign in with your secure admin account to view upcoming meetings and their live status.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-sm text-slate-700">Email</label>
                  <div className="mt-2 flex items-center gap-3 rounded-xl border border-blue-300 bg-blue-50 px-4 py-3">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="admin@dataversedynamics.org"
                      className="w-full bg-transparent outline-none text-slate-900 placeholder:text-slate-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-slate-700">Password</label>
                  <div className="mt-2 flex items-center gap-3 rounded-xl border border-blue-300 bg-blue-50 px-4 py-3">
                    <Lock className="h-5 w-5 text-orange-600" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••••"
                      className="w-full bg-transparent outline-none text-slate-900 placeholder:text-slate-400"
                      required
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage}
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting || loading}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 font-semibold h-12"
                >
                  {submitting ? 'Signing In...' : 'Secure Login'}
                </Button>
              </form>

              <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-slate-700">
                <span className="font-mono-alt text-blue-600">Tip:</span> Use your authorized admin email to sign in.
              </div>
            </div>
          </div>
        </div>
      </main>
      {!isStandalone && <Footer />}
    </div>
  );
};

export default AdminLogin;
