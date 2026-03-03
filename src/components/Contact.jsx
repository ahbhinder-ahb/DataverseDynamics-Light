import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConsultationModal from '@/components/ConsultationModal';

const Contact = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <section id="contact" className="py-24 bg-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-200/30 to-orange-200/30"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-5xl bg-gradient-to-r from-blue-600 to-orange-500 mb-4 bg-clip-text text-transparent">
                Ready to Transform Your Operations?
              </h2>
              <p className="text-xl text-slate-700 mb-12 max-w-2xl mx-auto">
                Join hundreds of organizations that trust Dataverse Dynamics (Global) to drive their operational excellence and strategic growth.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12"
            >
              <Button
                onClick={() => setIsModalOpen(true)}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-10 py-7 text-lg font-semibold rounded-full shadow-xl hover:shadow-blue-300/50 transition-all duration-300 transform hover:scale-105"
              >
                <Calendar className="mr-3" size={24} />
                Schedule Free Consultation
              </Button>

              <Button
                onClick={() => setIsModalOpen(true)}
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-10 py-7 text-lg font-semibold rounded-full shadow-xl hover:shadow-orange-300/50 transition-all duration-300 transform hover:scale-105"
              >
                <Mail className="mr-3" size={24} />
                Contact Us
                <ArrowRight className="ml-3" size={20} />
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      <ConsultationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default Contact;