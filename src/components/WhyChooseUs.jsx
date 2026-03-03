import React from 'react';
import { motion } from 'framer-motion';
import { Award, Workflow, Clock, Shield } from 'lucide-react';

const WhyChooseUs = () => {
  const pillars = [
    {
      title: 'Deep Expertise',
      icon: Award,
      description: 'Specialized expertise across diverse industries, applying structured methodologies and best practices to every engagement.',
      gradient: 'from-blue-600 to-blue-800'
    },
    {
      title: 'Integrated Approach',
      icon: Workflow,
      description: 'Seamless coordination across all service areas ensures holistic solutions that address your complete operational ecosystem.',
      gradient: 'from-teal-600 to-green-700'
    },
    {
      title: 'Global Support',
      icon: Clock,
      description: '24/7 availability with multi-timezone operations and local expertise, ensuring your business never stops moving forward.',
      gradient: 'from-green-600 to-teal-600'
    },
    {
      title: 'Governance & Compliance',
      icon: Shield,
      description: 'Rigorous standards, enterprise-grade security, and comprehensive regulatory compliance to protect your organization at every level.',
      gradient: 'from-blue-700 to-purple-700'
    }
  ];

  return (
    <section id="why-us" className="py-24 bg-white relative overflow-hidden">
      {/* Decorative background elements */}
<div className="absolute inset-0 opacity-5">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Why Choose Dataverse Dynamics
          </h2>
          <p className="text-xl text-slate-700 max-w-3xl mx-auto">
            Four pillars of excellence that set us apart
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ scale: 1.03, y: -5 }}
                className="group"
              >
                <div className={`relative p-8 rounded-2xl bg-gradient-to-br ${pillar.gradient} shadow-lg hover:shadow-2xl transition-all duration-300 h-full border border-blue-200 to-opacity-40`}>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-4 bg-blue-100 rounded-xl backdrop-blur-sm">
                      <Icon className="text-blue-600" size={36} />
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900 pt-2">{pillar.title}</h3>
                  </div>

                  <p className="text-slate-700 text-lg leading-relaxed">
                    {pillar.description}
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

export default WhyChooseUs;