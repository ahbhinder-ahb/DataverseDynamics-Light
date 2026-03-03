import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

const ServiceCard = ({ icon: Icon, title, services }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02, y: -5 }}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 p-6 flex flex-col h-full"
    >
      <div className="flex items-center gap-3 mb-4">
        {Icon && (
          <div className="p-2 bg-blue-100 rounded-lg">
            <Icon className="w-6 h-6 text-blue-600" />
          </div>
        )}
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
      </div>

      <ul className="space-y-2 flex-grow">
        {services && services.map((service, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="flex items-start gap-2"
          >
            <CheckCircle2 className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <span className="text-slate-700 text-sm">{service}</span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
};

export default ServiceCard;