import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Package, TrendingUp, Database, Building2, Check, Globe, Target, ChevronDown } from 'lucide-react';

const Services = () => {
  const [expandedCards, setExpandedCards] = useState({});

  const toggleCard = (index) => {
    setExpandedCards(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const serviceCategories = [
    {
      id: 'back-office-pillar',
      title: 'Back-Office Operations',
      icon: Package,
      gradient: 'bg-gradient-to-br from-blue-500 to-blue-600',
      link: '/back-office-operations',
      services: [
        { name: 'Supply Chain Management', id: 'supply-chain' },
        { name: 'Procurement', id: 'procurement' },
        { name: 'Inventory Management', id: 'inventory' },
        { name: 'Returns Management', id: 'returns' },
        { name: 'Payroll & HR Services', id: 'payroll-hr' },
        { name: 'Recruitment Services', id: 'recruitment' },
        { name: 'Employee/Vendor Commissions', id: 'commissions' },
        { name: 'AP/AR Management', id: 'ap-ar' },
        { name: 'Treasury Operations', id: 'treasury' },
        { name: 'Loss Prevention', id: 'loss-prevention' },
        { name: 'Internal Audits', id: 'internal-audits' },
        { name: 'Travel Management', id: 'travel' },
        { name: 'Gift Cards & Vouchers', id: 'gift-cards' }
      ]
    },
    {
      id: 'advisory-pillar',
      title: 'Advisory & Consulting',
      icon: TrendingUp,
      gradient: 'bg-gradient-to-br from-blue-500 to-cyan-500',
      link: '/advisory-consulting',
      services: [
        { name: 'Operational Decisions', id: 'operational-decisions' },
        { name: 'Financial Decisions', id: 'financial-decisions' },
        { name: 'Organizational Decisions', id: 'organizational-decisions' },
        { name: 'Process Improvement', id: 'process-improvement' },
        { name: 'Restructuring', id: 'restructuring' },
        { name: 'Capacity Building', id: 'capacity-building' },
        { name: 'Project Management', id: 'project-management' },
        { name: 'Governance Frameworks', id: 'governance' }
      ]
    },
    {
      id: 'data-reporting-pillar',
      title: 'Data & Reporting',
      icon: Database,
      gradient: 'bg-gradient-to-br from-blue-500 to-teal-500',
      link: '/data-reporting',
      services: [
        { name: 'Data Management', id: 'data-management' },
        { name: 'Business Analysis', id: 'business-analysis' },
        { name: 'Advanced Reporting', id: 'advanced-reporting' },
        { name: 'Documentation', id: 'documentation' },
        { name: 'Performance Metrics', id: 'performance-metrics' },
        { name: 'KPI Tracking', id: 'kpi-tracking' }
      ]
    },
    {
      id: 'expansion-pillar',
      title: 'Expansion & Infrastructure',
      icon: Building2,
      gradient: 'bg-gradient-to-br from-blue-500 to-cyan-500',
      link: '/expansion-infrastructure',
      services: [
        { name: 'White Space Management', id: 'white-space' },
        { name: 'Site Relocations', id: 'site-relocations' },
        { name: 'Facility Closures', id: 'facility-closures' },
        { name: 'Transition Planning', id: 'transition-planning' },
        { name: 'Vendor Coordination', id: 'vendor-coordination' }
      ]
    },
    {
      id: 'website-development-pillar',
      title: 'Website Development',
      icon: Globe,
      gradient: 'bg-gradient-to-br from-blue-600 to-blue-700',
      link: '/website-development',
      services: [
        { name: 'Custom Website Design', id: 'custom-design' },
        { name: 'E-Commerce Solutions', id: 'ecommerce' },
        { name: 'Responsive Web Development', id: 'responsive-dev' },
        { name: 'CMS Integration', id: 'cms' },
        { name: 'Website Maintenance', id: 'maintenance' },
        { name: 'Landing Page Design', id: 'landing-pages' },
        { name: 'Web Application Development', id: 'web-apps' }
      ]
    },
    {
      id: 'digital-marketing-pillar',
      title: 'Digital Marketing & SEO',
      icon: Target,
      gradient: 'bg-gradient-to-br from-orange-500 to-orange-600',
      link: '/digital-marketing-seo',
      services: [
        { name: 'Search Engine Optimization', id: 'seo' },
        { name: 'AI Brand Optimization', id: 'ai-brand' },
        { name: 'Content Marketing Strategy', id: 'content-marketing' },
        { name: 'Social Media Marketing', id: 'social-media' },
        { name: 'Email Marketing Campaigns', id: 'email-marketing' },
        { name: 'Analytics & Reporting', id: 'analytics' },
        { name: 'Brand Strategy', id: 'brand-strategy' }
      ]
    }
  ];

  return (
    <div className="bg-white">
      {/* Service Pillars Section */}
      <section id="services" className="py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Our Service Pillars
            </h2>
            <p className="text-xl text-slate-700 max-w-3xl mx-auto">
              Comprehensive solutions tailored to drive operational excellence and strategic growth
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-7xl mx-auto">
            {serviceCategories.map((pillar, index) => {
              const isExpanded = expandedCards[index];
              return (
                <motion.div
                  key={index}
                  id={pillar.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  transition={{ duration: 0.3 }}
                  className={`${pillar.gradient} rounded-xl p-8 shadow-xl hover:shadow-2xl flex flex-col relative overflow-hidden group ${isExpanded ? 'h-auto' : 'h-auto md:h-full'}`}
                >
                  {/* Header - Always visible, clickable on mobile */}
                  <div className="flex items-center justify-between mb-6 z-10">
                    <Link
                      to={`${pillar.link}?from=${pillar.id}`}
                      className="flex items-center gap-3 text-2xl font-bold text-slate-900 hover:text-blue-600 transition-colors duration-200 flex-1"
                    >
                      <div className="p-2 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
                        <pillar.icon className="w-8 h-8" />
                      </div>
                      <span className="relative group/title inline-block">
                        {pillar.title}
                        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-green-500 group-hover/title:w-full transition-all duration-300"></span>
                      </span>
                    </Link>

                    {/* Mobile expand/collapse button */}
                    <button
                      onClick={() => toggleCard(index)}
                      className="md:hidden p-2 text-slate-600 hover:text-slate-900 transition-colors z-20\"
                      aria-label={isExpanded ? 'Collapse services' : 'Expand services'}
                    >
                      <ChevronDown
                        className={`w-6 h-6 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </div>

                  {/* Services List - Collapsible on mobile, always visible on desktop */}
                  <motion.ul
                    initial={false}
                    animate={{
                      height: isExpanded ? 'auto' : 0,
                      opacity: isExpanded ? 1 : 0
                    }}
                    transition={{ duration: 0.3 }}
                    className={`space-y-3 flex-grow z-10 overflow-hidden md:!h-auto md:!opacity-100`}
                  >
                    {pillar.services.map((service, idx) => (
                      <motion.li
                        key={idx}
                        whileTap={{ scale: 1.05 }}
                        className="flex items-start text-slate-900"
                      >
                        <Check className="w-4 h-4 mt-1 mr-3 flex-shrink-0 text-orange-500" />
                        <Link
                          to={`${pillar.link}?from=${pillar.id}#${service.id}`}
                          className="text-sm font-medium relative transition-all duration-300
                                         hover:text-orange-600 hover:underline decoration-orange-300 underline-offset-4
                                         neon-glow"
                        >
                          {service.name}
                        </Link>
                      </motion.li>
                    ))}
                  </motion.ul>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Neon Glow Effect CSS */}
      <style>
        {`
          .neon-glow {
            transition: all 0.3s ease;
          }
          .neon-glow:hover, .neon-glow:active {
            text-shadow: 0 0 4px #f97316, 0 0 8px #f97316, 0 0 16px #f97316, 0 0 24px #f97316;
            color: #f97316;
          }
        `}
      </style>
    </div>
  );
};

export default Services;