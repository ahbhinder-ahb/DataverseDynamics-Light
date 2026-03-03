import React from 'react';
import { motion } from 'framer-motion';
import { Rocket, Building, Users, Globe, Briefcase, Landmark } from 'lucide-react';

const Industries = () => {
  const sectors = [
    {
      title: 'Startups',
      icon: Rocket,
      description: 'Agile support to help innovative startups scale rapidly while maintaining operational efficiency',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'SMEs',
      icon: Building,
      description: 'Tailored solutions for small and medium enterprises looking to optimize and grow sustainably',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Enterprises',
      icon: Briefcase,
      description: 'Enterprise-grade services for large organizations requiring sophisticated operational support',
      color: 'from-cyan-500 to-teal-500'
    },
    {
      title: 'Public Organizations',
      icon: Users,
      description: 'Governance-focused solutions for public sector entities with strict compliance requirements',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Private Organizations',
      icon: Landmark,
      description: 'Flexible, performance-driven services for private sector companies across all industries',
      color: 'from-orange-500 to-orange-600'
    },
    {
      title: 'Multinational Organizations',
      icon: Globe,
      description: 'Global compliance, cross-border logistics, and unified reporting frameworks.',
      color: 'from-blue-600 to-cyan-600'
    }
  ];

  return (
    <section id="industries" className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Who We Serve
          </h2>
          <p className="text-xl text-slate-700 max-w-3xl mx-auto">
            Diverse expertise across sectors, unified by excellence
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {sectors.map((sector, index) => {
            const Icon = sector.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="group"
              >
                <div className={`relative p-6 rounded-2xl bg-gradient-to-br ${sector.color} shadow-lg hover:shadow-2xl transition-all duration-300 h-full`}>
                  <div className="mb-4">
                    <div className="inline-block p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Icon className="text-white" size={32} />
                    </div>
                  </div>

                  <h3 className="text-2xl font-bold text-white/90 hover:text-white transition-colors duration-200 mb-3">
                    <span className="relative group/title inline-block">
                      {sector.title}
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-green-500 group-hover/title:w-full transition-all duration-300"></span>
                    </span>
                  </h3>

                  <p className="text-white/90 leading-relaxed">
                    {sector.description}
                  </p>

                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl pointer-events-none"></div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Industries;