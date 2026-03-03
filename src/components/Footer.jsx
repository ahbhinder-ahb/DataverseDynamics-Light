import React from 'react';
import { Facebook, Linkedin, Twitter, Mail, Phone, MapPin, Database } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
const Footer = () => {
  const navigate = useNavigate();
  const handleNavClick = sectionId => {
    if (window.location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) element.scrollIntoView({
          behavior: 'smooth'
        });
      }, 100);
    } else {
      const element = document.getElementById(sectionId);
      if (element) element.scrollIntoView({
        behavior: 'smooth'
      });
    }
  };
  const handlePillarClick = pillarId => {
    navigate(`/?anchor=${pillarId}`);
  };
  const scrollToTop = () => {
    window.scrollTo(0, 0);
  };
  return <footer className="bg-white text-slate-800 border-t border-blue-200">
    <div className="container mx-auto px-4 py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        {/* Company Info */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Database className="text-orange-500 h-8 w-8" />
            <h3 className="text-xl font-bold text-slate-900">Dataverse Dynamics (Global)</h3>
          </div>
          <p className="text-slate-700 leading-relaxed">
            Empowering businesses with end-to-end back-office, advisory, and management consulting services.
          </p>
          <div className="flex gap-4 pt-2">
            <a href="https://www.linkedin.com/in/dataversedynamics" target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded-lg hover:bg-blue-500 hover:text-white transition-colors shadow-sm">
              <Linkedin size={20} />
            </a>
            <a href="#" className="p-2 bg-white rounded-lg hover:bg-blue-500 hover:text-white transition-colors shadow-sm">
              <Twitter size={20} />
            </a>
            <a href="#" className="p-2 bg-white rounded-lg hover:bg-orange-500 hover:text-white transition-colors shadow-sm">
              <Facebook size={20} />
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-lg font-semibold text-slate-900 mb-6">Quick Links</h4>
          <ul className="space-y-4">
            <li>
              <Link to="/" onClick={scrollToTop} className="hover:text-orange-600 transition-colors text-slate-700">
                Home
              </Link>
            </li>
            <li>
              <button onClick={() => handleNavClick('services')} className="hover:text-orange-600 transition-colors text-left text-slate-700">
                Services
              </button>
            </li>
            <li>
              <button onClick={() => handleNavClick('why-us')} className="hover:text-orange-600 transition-colors text-left text-slate-700">
                About
              </button>
            </li>
            <li>
              <button onClick={() => handleNavClick('contact')} className="hover:text-orange-600 transition-colors text-left text-slate-700">
                Contact Us
              </button>
            </li>
            <li>
              <Link to="/admin/login" onClick={scrollToTop} className="hover:text-orange-600 transition-colors text-slate-700">
                Admin Login
              </Link>
            </li>
          </ul>
        </div>

        {/* Our Services */}
        <div>
          <h4 className="text-lg font-semibold text-slate-900 mb-6">Our Services</h4>
          <ul className="space-y-4">
            <li>
              <button onClick={() => handlePillarClick('back-office-pillar')} className="hover:text-orange-600 transition-colors cursor-pointer text-left text-slate-700">Back-Office Operations</button>
            </li>
            <li>
              <button onClick={() => handlePillarClick('advisory-pillar')} className="hover:text-orange-600 transition-colors cursor-pointer text-left text-slate-700">Advisory & Consulting</button>
            </li>
            <li>
              <button onClick={() => handlePillarClick('data-reporting-pillar')} className="hover:text-orange-600 transition-colors cursor-pointer text-left text-slate-700">Data & Reporting</button>
            </li>
            <li>
              <button onClick={() => handlePillarClick('expansion-pillar')} className="hover:text-orange-600 transition-colors cursor-pointer text-left text-slate-700">Expansion & Infrastructure</button>
            </li>
          </ul>
        </div>

        {/* Contact Us */}
        <div>
          <h4 className="text-lg font-semibold text-slate-900 mb-6">Contact Us</h4>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-600 mt-1" />
              <span className="text-slate-700">contact@dataversedynamics.org</span>
            </li>
            <li className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-blue-600 mt-1" />
              <span className="text-slate-700"></span>
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-blue-600 mt-1" />
              <span></span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    {/* Bottom Bar */}
    <div className="bg-white border-t border-blue-200 py-8">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-sm text-slate-700">
          © 2026 Dataverse Dynamics (Global). All rights reserved.
        </p>
        <div className="flex gap-8 text-sm text-slate-700">
          <Link to="/privacy-policy" onClick={scrollToTop} className="hover:text-blue-600 transition-colors">Privacy Policy</Link>
          <Link to="/terms-of-service" onClick={scrollToTop} className="hover:text-blue-600 transition-colors">Terms of Service</Link>
          <Link to="/cookie-policy" onClick={scrollToTop} className="hover:text-blue-600 transition-colors">Cookie Policy</Link>
        </div>
      </div>
    </div>
  </footer>;
};
export default Footer;