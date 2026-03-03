import React from 'react';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useSEO } from '@/hooks/useSEO';
import { seoMetadata } from '@/config/seoMetadata';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const NotFoundPage = () => {
  const navigate = useNavigate();
  useSEO(seoMetadata.notFound);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoToServices = () => {
    navigate('/?anchor=services');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Header />

      <main className="flex-grow flex items-center justify-center relative overflow-hidden py-32 px-4">
        {/* Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-600/5 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-2xl w-full text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-8"
          >
            <div className="relative">
              <span className="text-9xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-orange-500 select-none opacity-20 blur-sm absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-150">
                404
              </span>
              <span className="text-9xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-orange-500 relative z-10">
                404
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-4"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
              Page Not Found
            </h1>
            <p className="text-xl text-slate-700 max-w-lg mx-auto leading-relaxed">
              We couldn't find the page you were looking for. It might have been moved, deleted, or never existed in the first place.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center pt-8"
          >
            <Button
              onClick={handleGoHome}
              size="lg"
              className="bg-white text-slate-900 hover:bg-slate-200 font-bold px-8 h-12 flex items-center gap-2"
            >
              <Home size={18} />
              Back to Home
            </Button>

            <Button
              onClick={handleGoToServices}
              variant="outline"
              size="lg"
              className="border-blue-300 text-slate-900 hover:bg-blue-50 hover:text-slate-900 font-bold px-8 h-12 flex items-center gap-2"
            >
              <Search size={18} />
              Explore Services
            </Button>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NotFoundPage;