import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Calendar } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ConsultationModal from '@/components/ConsultationModal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ServicePageLayout = ({
  title,
  description,
  icon: Icon,
  theme, // Expecting { gradient, primary, secondary, accent, border, shadow, textAccent, button }
  services,
  backgroundImage
}) => {
  const [activeSection, setActiveSection] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [hoveredServiceId, setHoveredServiceId] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Handle hash navigation on load
    if (window.location.hash) {
      const id = window.location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
          setActiveSection(id);
        }, 100);
      }
    } else {
      // If no hash, scroll to top on mount
      window.scrollTo(0, 0);
    }

    // Intersection Observer for scroll spy
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -50% 0px' }
    );

    services.forEach((service) => {
      const element = document.getElementById(service.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [services]);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(id);
      window.history.pushState(null, '', `#${id}`);
    }
  };

  const handleBackToHome = () => {
    const fromPillar = searchParams.get('from');
    if (fromPillar) {
      navigate(`/?anchor=${fromPillar}`);
    } else {
      navigate('/');
    }
  };

  const handleGetSupport = (serviceName) => {
    setSelectedService(serviceName);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Header />

      <main className="flex-grow pt-20">
        {/* Hero Section */}
        <section className="relative py-32 md:py-40 overflow-hidden min-h-[60vh] flex flex-col justify-center">
          {backgroundImage && (
            <div className="absolute inset-0 z-0">
              <img
                src={backgroundImage}
                alt={title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-white/85" />
              <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-10 mix-blend-overlay`} />
            </div>
          )}

          {!backgroundImage && (
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-10`} />
          )}

          <div className="container mx-auto px-4 relative z-10">
            <button
              onClick={handleBackToHome}
              className={cn(
                "inline-flex items-center mb-8 transition-all group font-semibold tracking-wide text-sm uppercase",
                theme.textAccent,
                theme.hoverTextAccent
              )}
            >
              <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </button>

            <div className="max-w-5xl">
              <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8">
                <div className={cn(
                  "p-5 rounded-2xl bg-gradient-to-br shadow-2xl border border-white/10 w-fit",
                  theme.iconGradient,
                  theme.shadow
                )}>
                  <Icon className="h-12 w-12 text-blue-600" />
                </div>
                <h1 className="text-5xl md:text-7xl font-bold text-slate-900 tracking-tight leading-tight">
                  {title}
                </h1>
              </div>
              <div className={cn("h-1 w-24 mb-8 rounded-full", theme.bgAccent)} />
              <p className="text-xl md:text-2xl text-slate-700 leading-relaxed max-w-3xl font-light">
                {description}
              </p>
            </div>
          </div>
        </section>

        {/* Quick Nav Cards */}
        <section className="py-16 bg-blue-50 border-b border-blue-200 relative z-10">
          <div className="container mx-auto px-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-6">Explore Our Services</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {services.map((service) => {
                const isHovered = hoveredServiceId === service.id;
                const isActive = activeSection === service.id;

                return (
                  <motion.button
                    key={service.id}
                    onClick={() => scrollToSection(service.id)}
                    onMouseEnter={() => setHoveredServiceId(service.id)}
                    onMouseLeave={() => setHoveredServiceId(null)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.96 }}
                    className={cn(
                      "p-3 text-left rounded-2xl transition-all duration-300 border group h-full flex flex-col justify-between relative overflow-hidden",
                      isHovered
                        ? cn(theme.button, "border-transparent shadow-xl ring-2 ring-blue-200/50")
                        : isActive
                          ? cn("bg-white shadow-lg border-2 border-blue-400", theme.border, theme.shadow)
                          : "bg-white border border-blue-200"
                    )}
                  >
                    <h3 className={cn(
                      "font-semibold text-sm leading-tight transition-colors",
                      isHovered ? "text-blue-600" : (isActive ? theme.textAccent : "text-slate-700")
                    )}>
                      {service.title}
                    </h3>
                    <div className="flex justify-end mt-3">
                      <ArrowRight className={cn(
                        "h-4 w-4 transition-colors",
                        isHovered ? "text-blue-600" : (isActive ? theme.textAccent : "text-slate-600")
                      )} />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Detailed Sections */}
        <div className="bg-white relative">
          <div className="container mx-auto px-4 py-24 space-y-32">
            {services.map((service, index) => (
              <motion.section
                key={service.id}
                id={service.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className="scroll-mt-48 relative"
              >
                {/* Decorative Timeline Line */}
                <div className={cn(
                  "absolute left-0 md:-left-8 top-0 bottom-0 w-1 rounded-full opacity-40 hidden md:block",
                  activeSection === service.id ? theme.bgAccent : "bg-blue-200"
                )} />

                <div className={cn(
                  "rounded-3xl border border-blue-200 bg-white p-4 md:p-6 transition-all duration-500 backdrop-blur-sm",
                  activeSection === service.id
                    ? cn("border-opacity-80 shadow-2xl border-blue-400", theme.border, theme.shadow)
                    : "border-blue-200 hover:border-blue-300"
                )}>
                  <div className="flex flex-col gap-6 mb-8">
                    <span className={cn("text-6xl font-bold opacity-10 select-none", theme.textAccent)}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h3 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
                      {service.title}
                    </h3>
                  </div>

                  <div className="grid md:grid-cols-3 gap-12">
                    <div className="md:col-span-2 prose max-w-none">
                      <p className="text-xl text-slate-700 leading-relaxed font-light">
                        {service.description}
                      </p>

                      {service.details && (
                        <div className="mt-8">
                          <h4 className="text-sm uppercase tracking-widest text-slate-700 font-bold mb-4">Key Capabilities</h4>
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {service.details.map((detail, idx) => (
                              <li key={idx} className="flex items-center gap-3 text-slate-700 group">
                                <div className={cn("h-2 w-2 rounded-full flex-shrink-0 transition-transform group-hover:scale-125", theme.bgAccent)} />
                                <span className="text-base">{detail}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col justify-end items-start md:items-end">
                      <Button
                        onClick={() => handleGetSupport(service.title)}
                        className={cn(
                          "text-white shadow-lg transition-all duration-300 px-8 py-6 h-auto text-lg font-semibold rounded-2xl w-full md:w-auto",
                          theme.button
                        )}
                      >
                        Schedule Free Consultation
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.section>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <section className="py-24 bg-gradient-to-br from-blue-50 to-white border-t border-blue-200 relative overflow-hidden">
          <div className={cn("absolute inset-0 opacity-10 bg-gradient-to-t", theme.gradient)} />
          <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
              Ready to Optimize Your Operations?
            </h2>
            <p className="text-xl text-slate-700 mb-12 max-w-2xl mx-auto leading-relaxed">
              Schedule a consultation today and discover how our expert team can transform your business processes.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button
                onClick={() => setSelectedService(title)}
                size="lg"
                className={cn(
                  "text-white text-lg px-10 py-8 rounded-full shadow-2xl hover:shadow-3xl transition-all hover:-translate-y-1 font-bold flex items-center gap-3",
                  "bg-gradient-to-r", theme.gradient
                )}
              >
                <Calendar className="h-6 w-6" />
                Schedule Free Consultation
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      {/* Pass selectedService as initialService */}
      <ConsultationModal
        isOpen={selectedService !== null}
        onClose={() => setSelectedService(null)}
        initialService={selectedService}
      />
    </div>
  );
};

export default ServicePageLayout;