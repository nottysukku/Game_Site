import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import reactImage from '../assets/github.png';
import boyImage from '../assets/boy.png';
import newImage from '../assets/1269.png_860-removebg-preview.png';
import godofwar from '../assets/cartoongaming2-removebg-preview.png';
import callofduty from '../assets/cartoongaming-removebg-preview.png';
import Nav from '../components/Nav';
import Foot from '../components/Foot';
import Carousel from '../components/Carousel';

const FuturisticCarouselContainer = ({ children }) => {
  return (
    <div className="relative w-full max-w-7xl mx-auto my-12 z-20">
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-blue-800 to-red-800 rounded-[3rem] opacity-40 blur-xl"
        animate={{ scale: [1.02, 1.0, 1.02], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative rounded-[3rem] overflow-hidden border border-blue-300/30 bg-black/20 backdrop-blur-sm p-4">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 pointer-events-none"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
        {children}
      </div>
    </div>
  );
};

export default function GameSiteLanding() {
  const footerRef = useRef(null);
  const carouselRef = useRef(null);

  const handleReactImageClick = () => {
    window.open('https://github.com/nottysukku', '_blank');
  };

  const handleContactClick = (e) => {
    e.preventDefault();
    if (footerRef.current) {
      footerRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleGamesClick = (e) => {
    e.preventDefault();
    if (carouselRef.current) {
      carouselRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <div className="relative min-h-[5rem] bg-[#1F2937] text-gray-100 flex flex-col md:flex-row justify-between items-center text-center p-6 group shadow-2xl z-50 border-b border-gray-700">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-800 to-blue-600 rounded-lg blur-md opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-300"></div>
        <div className="relative flex w-full flex-col md:flex-row justify-between items-center space-x-4 z-10">
          <img
            src={reactImage}
            alt="react"
            onClick={handleReactImageClick}
            className="cursor-pointer w-16 h-16 rounded-full transition duration-300 hover:scale-110 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
          />
          <div id="heading" className="flex-grow text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 text-3xl md:text-6xl font-black md:w-auto md:text-center uppercase tracking-widest drop-shadow-lg">
            PlaySphere: Adventure Awaits
          </div>
          <Nav onContactClick={handleContactClick} onGamesClick={handleGamesClick} />
        </div>
      </div>

      <div className="w-full min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-blue-900 to-black text-white flex flex-col items-center relative overflow-hidden">
        {/* Animated background stars/particles placeholder */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:space-x-8 w-full justify-center p-8 mt-10 z-10">
          <img src={godofwar} className='sm:w-4/12 md:w-1/5 h-auto rounded-3xl transition-all duration-500 hover:scale-110 hover:shadow-[0_0_40px_rgba(255,0,0,0.4)] drop-shadow-2xl' alt="god of war" />
          <img src={boyImage} className='lg:block hidden sm:w-4/12 md:w-1/5 h-auto rounded-3xl transition-all duration-500 hover:scale-110 hover:shadow-[0_0_40px_rgba(0,255,255,0.4)] drop-shadow-2xl' alt="boy" />
          <img src={newImage} className='lg:block hidden sm:w-4/12 md:w-1/5 h-auto rounded-3xl transition-all duration-500 hover:scale-110 hover:shadow-[0_0_40px_rgba(255,255,0,0.4)] drop-shadow-2xl' alt="new" />
          <img src={callofduty} className='sm:w-4/12 md:w-1/5 h-auto rounded-3xl transition-all duration-500 hover:scale-110 hover:shadow-[0_0_40px_rgba(0,255,0,0.4)] drop-shadow-2xl' alt="call of duty" />
        </div>

        <div ref={carouselRef} className="w-full px-4 md:px-12 mt-10 z-10">
          <h2 className="text-center text-4xl md:text-6xl font-black text-white/90 drop-shadow-lg mb-4">CHOOSE YOUR GAME</h2>
          <FuturisticCarouselContainer>
            <Carousel />
          </FuturisticCarouselContainer>
        </div>

        <div className="z-10 mt-12 mb-20 max-w-4xl text-center px-6">
          <h1 className="text-xl md:text-3xl font-light italic leading-relaxed text-gray-300 border-l-4 border-cyan-400 pl-6 bg-white/5 p-8 rounded-r-3xl shadow-xl backdrop-blur-sm">
            "Every setback is a setup for a comeback. Embrace challenges as opportunities to grow. With each defeat, learn, adapt, and push harder. Remember, the road to victory is paved with persistence and skill. Keep grinding, and the triumph will be yours. <strong className="text-cyan-400 font-bold">Game on!</strong>"
          </h1>
        </div>
      </div>
      
      <div ref={footerRef}>
        <Foot />
      </div>
    </>
  );
}
