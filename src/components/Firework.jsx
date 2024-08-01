import React, { useEffect, useRef } from 'react';
import Fireworks from 'fireworks-js';

const Firework = ({ start }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (start && containerRef.current) {
      console.log('Starting fireworks');
      const fireworks = new Fireworks(containerRef.current, {
        maxRockets: 1,
        rocketSpawnInterval: 150,
        numParticles: 100,
      });

      fireworks.start();

      // Cleanup on component unmount
      return () => {
        console.log('Stopping fireworks');
        fireworks.stop();
      };
    }
  }, [start]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
        overflow: 'hidden',
      }}
    />
  );
};

export default Firework;
