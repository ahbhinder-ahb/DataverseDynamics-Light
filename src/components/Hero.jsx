import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConsultationModal from '@/components/ConsultationModal';

// Reusable word animation component
const AnimatedWord = ({
  word,
  index,
  baseDelay = 0,
  className = "",
  staggerDelay = 0.1
}) => {
  const directions = [
    { x: 900, y: 0 },
    { x: 0, y: 900 },
    { x: -900, y: 0 },
    { x: 0, y: -900 },
  ];

  const direction = directions[index % 4];

  return (
    <motion.span
      initial={{
        opacity: 0,
        x: direction.x,
        y: direction.y,
        filter: "blur(80px)"
      }}
      animate={{
        opacity: 1,
        x: 0,
        y: 0,
        filter: "blur(0px)"
      }}
      transition={{
        duration: 0.6,
        delay: baseDelay + (index * staggerDelay),
        ease: [0.2, 0.65, 0.3, 0.9],
      }}
      className={`inline-block ${className}`}
    >
      {word}
    </motion.span>
  );
};

const Hero = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile devices
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scrollToServices = () => {
    const element = document.getElementById('services');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const headingPart1 = "Transform Your Operations, ".split(" ").filter(Boolean);
  const headingPart2 = "Accelerate Your Growth".split(" ").filter(Boolean);

  const subtitleText = "Welcome to a smarter way to grow online. Simple & Powerful, Built for you.".split(" ").filter(Boolean);
  const descriptionText = "Global consulting and back-office services designed for ambitious organizations".split(" ").filter(Boolean);

  const headingStagger = 0.1;
  const subtitleStagger = 0.05;
  const descStagger = 0.03;

  const subtitleStartDelay = 0.8;
  const descStartDelay = 1.8;
  const buttonStartDelay = 2.4;

  // Glow animation variants
  const subtitleVariants = {
    desktop: {
      whileHover: {
        textShadow: `
          0 0 8px rgba(59, 130, 246, 0.8),
          0 0 16px rgba(59, 130, 246, 0.6),
          0 0 32px rgba(59, 130, 246, 0.4)
        `,
        scale: 1.05
      },
      initial: { textShadow: "0 0 0px rgba(59, 130, 246, 0)", scale: 1 },
    },
    mobile: {
      whileTap: {
        textShadow: `
          0 0 8px rgba(59, 130, 246, 0.8),
          0 0 16px rgba(59, 130, 246, 0.6),
          0 0 32px rgba(59, 130, 246, 0.4)
        `,
        scale: 1.05,
      },
      initial: { textShadow: "0 0 0px rgba(59, 130, 246, 0)", scale: 1 },
    }
  };

  const descriptionVariants = {
    desktop: {
      whileHover: {
        textShadow: [
          "0 0 4px rgba(249, 115, 22, 0.8), 0 0 8px rgba(249, 115, 22, 0.6), 0 0 16px rgba(249, 115, 22, 0.4)",
          "0 0 8px rgba(249, 115, 22, 0.8), 0 0 16px rgba(249, 115, 22, 0.6), 0 0 32px rgba(249, 115, 22, 0.4)",
          "0 0 6px rgba(249, 115, 22, 0.8), 0 0 12px rgba(249, 115, 22, 0.6), 0 0 24px rgba(249, 115, 22, 0.4)"
        ],
        scale: 1.05
      },
      initial: { textShadow: "0 0 0px rgba(249, 115, 22, 0)", scale: 1 },
    },
    mobile: {
      whileTap: {
        textShadow: [
          "0 0 4px rgba(249,115,22,0.8), 0 0 8px rgba(249,115,22,0.6), 0 0 16px rgba(249,115,22,0.4)",
          "0 0 8px rgba(249,115,22,0.8), 0 0 16px rgba(249,115,22,0.6), 0 0 32px rgba(249,115,22,0.4)",
          "0 0 6px rgba(249,115,22,0.8), 0 0 12px rgba(249,115,22,0.6), 0 0 24px rgba(249,115,22,0.4)"
        ],
        scale: 1.05,
      },
      initial: { textShadow: "0 0 0px rgba(249,115,22,0)", scale: 1 },
    }
  };

  return (
    <>
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white">
        {/* Background Image with Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-white z-10"></div>
          <img
            src="https://horizons-cdn.hostinger.com/d32fabd8-b87f-4b44-acc9-74b57bb8db29/hero-back-gound-p23F3.jpeg"
            alt="Modern technology background"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content */}
        <div className="relative z-20 container mx-auto px-4 py-32">
          <div className="max-w-4xl mx-auto text-center">

            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 leading-tight flex flex-wrap justify-center gap-x-3 gap-y-2">
              {headingPart1.map((word, i) => (
                <AnimatedWord
                  key={`h1-p1-${i}`}
                  word={word}
                  index={i}
                  baseDelay={0}
                  staggerDelay={headingStagger}
                />
              ))}
              {headingPart2.map((word, i) => (
                <AnimatedWord
                  key={`h1-p2-${i}`}
                  word={word}
                  index={headingPart1.length + i}
                  baseDelay={0}
                  staggerDelay={headingStagger}
                  className="bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent"
                />
              ))}
            </h1>

            {/* Subtitle */}
            <div className="mb-6 flex justify-center">
              <motion.h2
                {...(isMobile ? subtitleVariants.mobile : subtitleVariants.desktop)}
                className="
                  text-xl md:text-3xl leading-relaxed font-semibold max-w-3xl
                  flex flex-wrap justify-center gap-x-1.5 text-slate-800
                "
              >
                {subtitleText.map((word, i) => (
                  <AnimatedWord
                    key={`sub-${i}`}
                    word={word}
                    index={i}
                    baseDelay={subtitleStartDelay}
                    staggerDelay={subtitleStagger}
                    className="bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent"
                  />
                ))}
              </motion.h2>
            </div>

            {/* Description */}
            <div className="mb-12 flex justify-center">
              <motion.p
                {...(isMobile ? descriptionVariants.mobile : descriptionVariants.desktop)}
                className="text-lg md:text-xl text-slate-700 leading-relaxed max-w-2xl flex flex-wrap justify-center gap-x-1"
              >
                {descriptionText.map((word, i) => (
                  <AnimatedWord
                    key={`desc-${i}`}
                    word={word}
                    index={i}
                    baseDelay={descStartDelay}
                    staggerDelay={descStagger}
                  />
                ))}
              </motion.p>
            </div>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: buttonStartDelay, ease: 'easeOut' }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Button
                onClick={() => setIsModalOpen(true)}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-6 text-lg font-semibold rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
              >
                <Calendar className="mr-2" size={20} />
                Schedule Free Consultation
              </Button>

              <Button
                onClick={scrollToServices}
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-6 text-lg font-semibold rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
              >
                Explore Our Services
                <ArrowRight className="ml-2" size={20} />
              </Button>
            </motion.div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent z-10"></div>
      </section>

      <ConsultationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default Hero;