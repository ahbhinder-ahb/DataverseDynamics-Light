import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const AnimatedLinesBackground = () => {
  const containerRef = useRef(null);

  // Generate random lines with animation properties
  const generateLines = () => {
    // Elegant corporate color palette
    const colors = [
      { main: '#1e40af', glow: 'rgba(30, 64, 175, 0.5)' }, // Deep Blue
      { main: '#7c3aed', glow: 'rgba(124, 58, 237, 0.4)' }, // Purple
      { main: '#0369a1', glow: 'rgba(3, 105, 161, 0.5)' }, // Professional Blue
      { main: '#64748b', glow: 'rgba(100, 118, 139, 0.4)' }, // Slate Gray
      { main: '#5b21b6', glow: 'rgba(91, 33, 182, 0.4)' }, // Violet
    ];

    const lines = [];
    const lineCount = 25;

    for (let i = 0; i < lineCount; i++) {
      const colorPair = colors[Math.floor(Math.random() * colors.length)];
      const startX = Math.random() * window.innerWidth;
      const startY = Math.random() * window.innerHeight;
      const angle = Math.random() * 360;
      const length = 200 + Math.random() * 350;
      const duration = 15 + Math.random() * 20;
      const delay = Math.random() * 6;

      // Gentle directions for elegant movement
      const directions = [
        { x: 300, y: 300 },
        { x: -300, y: 300 },
        { x: 300, y: -300 },
        { x: -300, y: -300 },
        { x: 400, y: 0 },
        { x: -400, y: 0 },
        { x: 0, y: 400 },
        { x: 0, y: -400 },
      ];

      const direction = directions[Math.floor(Math.random() * directions.length)];

      lines.push({
        id: i,
        colorMain: colorPair.main,
        colorGlow: colorPair.glow,
        startX,
        startY,
        angle,
        length,
        duration,
        delay,
        direction,
      });
    }

    return lines;
  };

  const lines = generateLines();

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 10, background: 'transparent' }}
    >
      {lines.map((line) => (
        <motion.div
          key={`line-${line.id}`}
          className="absolute"
          style={{
            left: `${line.startX}px`,
            top: `${line.startY}px`,
            width: `${line.length}px`,
            height: '1.5px',
            background: `linear-gradient(90deg, transparent 0%, ${line.colorMain} 20%, ${line.colorMain} 80%, transparent 100%)`,
            transformOrigin: '0% 50%',
            filter: 'blur(0.3px)',
            boxShadow: `0 0 12px ${line.colorGlow}`,
          }}
          initial={{
            transform: `rotate(${line.angle}deg) translateX(0px) translateY(0px)`,
            opacity: 0.15,
          }}
          animate={{
            transform: `rotate(${line.angle}deg) translateX(${line.direction.x}px) translateY(${line.direction.y}px)`,
            opacity: [0.15, 0.45, 0.15],
          }}
          transition={{
            duration: line.duration,
            delay: line.delay,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

export default AnimatedLinesBackground;
