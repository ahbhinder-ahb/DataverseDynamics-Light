import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';

const HowWeHelp = () => {
  const challenges = [
    { problem: 'Operational inefficiencies draining resources', icon: AlertCircle },
    { problem: 'Scaling challenges limiting growth potential', icon: AlertCircle },
    { problem: 'Data management gaps affecting decisions', icon: AlertCircle },
    { problem: 'Compliance risks threatening stability', icon: AlertCircle },
    { problem: 'Resource constraints preventing innovation', icon: AlertCircle }
  ];

  const solutions = [
    { outcome: 'Streamlined operations for maximum efficiency', icon: CheckCircle2 },
    { outcome: 'Faster, sustainable growth trajectory', icon: CheckCircle2 },
    { outcome: 'Actionable insights driving smart decisions', icon: CheckCircle2 },
    { outcome: 'Reduced risk with robust compliance', icon: CheckCircle2 },
    { outcome: 'Focused teams driving innovation', icon: CheckCircle2 }
  ];

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
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
            How We Help You Succeed
          </h2>
          <p className="text-xl text-slate-700 max-w-3xl mx-auto">
            Transforming challenges into opportunities for growth
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto mb-16">
          {/* Challenges Column */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-2xl font-bold text-orange-600 mb-8 flex items-center gap-3">
              <AlertCircle size={28} />
              Common Challenges
            </h3>
            <div className="space-y-4">
              {challenges.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-start gap-4 p-4 rounded-xl bg-red-900/20 backdrop-blur-sm border border-red-500/20"
                >
                  <AlertCircle className="text-red-400 mt-1 flex-shrink-0" size={20} />
                  <span className="text-slate-900">{item.problem}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Solutions Column */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-2xl font-bold text-green-400 mb-8 flex items-center gap-3">
              <CheckCircle2 size={28} />
              Dataverse Dynamics (Global) Solutions
            </h3>
            <div className="space-y-4">
              {solutions.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-start gap-4 p-4 rounded-xl bg-green-900/20 backdrop-blur-sm border border-green-500/20"
                >
                  <CheckCircle2 className="text-green-400 mt-1 flex-shrink-0" size={20} />
                  <span className="text-slate-900">{item.outcome}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Impact Metric */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center"
        >
          <div className="inline-block p-8 rounded-2xl bg-gradient-to-br from-blue-600/30 to-green-600/30 backdrop-blur-sm border border-white/10">
            <div className="flex items-center justify-center gap-3 mb-2">
              <TrendingUp className="text-green-400" size={32} />
              <span className="text-5xl font-bold text-slate-900">Trusted by businesses</span>
            </div>
            <p className="text-3xl text-slate-800">that continue to grow with us.</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowWeHelp;