import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import reactImage from './assets/github.png';
import boyImage from './assets/boy.png';
import newImage from './assets/1269.png_860-removebg-preview.png';
import godofwar from './assets/cartoongaming2-removebg-preview.png';
import callofduty from './assets/cartoongaming-removebg-preview.png';
import Nav from './components/Nav';
import Button from './Button';
import Button1 from './Button1';
import Button2 from './Button2';
import Foot from './components/Foot';
import Carousel from './components/Carousel';


const FuturisticCarouselContainer = ({ children }) => {
  return (
    <div className="relative w-full max-w-4xl mx-auto">
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-blue-800 to-red-800 rounded-3xl opacity-50"
        animate={{
          scale: [1.2, 1.02, 1.2],
          opacity: [0.5, 0.7, 0.5],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <div className="relative rounded-3xl overflow-hidden border-4 border-blue-100">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-800 opacity-50"
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <div className="relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
};

function App() {
  const footerRef = useRef(null);
  const carouselRef = useRef(null);
  const [showButton, setShowButton] = useState(false);
  const [showButton1, setShowButton1] = useState(false);
  const [showButton2, setShowButton2] = useState(false);

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

  const handleTicTacToeClick = () => {
    setShowButton(true);
    setShowButton1(false);
    setShowButton2(false);
  };

  const handleSnakeClick = () => {
    setShowButton(false);
    setShowButton2(false);
    setShowButton1(true);
  };

  const handleSnakesandLaddersClick = () => {
    setShowButton(false);
    setShowButton2(true);
    setShowButton1(false);
  };

  if (showButton) {
    return <Button />;
  }
  if (showButton1) {
    return <Button1 />;
  }
  if (showButton2) {
    return <Button2 />;
  }

  return (
    <>
      <div className="relative min-h-[2rem] bg-[#1F2937] text-gray-100 flex flex-col md:flex-row justify-between items-center text-center p-4 group">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-800 to-blue-600 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative flex w-full flex-col md:flex-row justify-between items-center space-x-4 z-10">
          <img
            src={reactImage}
            alt="react"
            onClick={handleReactImageClick}
            className="cursor-pointer w-12 h-12 rounded-full transition duration-300"
          />
          <div id="heading" className="flex-grow text-indigo-300 text-2xl md:text-5xl font-bold md:w-auto md:text-center">
            PlaySphere: Adventure Awaits
          </div>
          <Nav
            onContactClick={handleContactClick}
            onGamesClick={handleGamesClick}
          />
        </div>
      </div>
      <div className="w-full min-h-screen bg-gradient-to-r from-black via-blue-500 to-black text-white flex flex-col justify-between items-center">
        <div className="flex flex-col md:flex-row md:space-x-4 w-full md:w-auto p-4 space-y-4 md:space-y-0">
          <img src={godofwar} className='sm:w-4/12 md:w-3/12 h-auto border-4 rounded-3xl border-transparent transition-all duration-300 hover:shadow-2xl' alt="god of war" />
          <img src={boyImage} className='lg:block hidden sm:w-4/12 md:w-3/12 h-auto border-4 rounded-3xl border-transparent transition-all duration-300 hover:shadow-2xl' alt="boy" />
          <img src={newImage} className='lg:block hidden sm:w-4/12 md:w-3/12 h-auto border-4 rounded-3xl border-transparent transition-all duration-300 hover:shadow-2xl' alt="new" />
          <img src={callofduty} className='sm:w-4/12 md:w-3/12 h-auto border-4 rounded-3xl border-transparent transition-all duration-300 hover:shadow-2xl' alt="call of duty" />
        </div>

        <div ref={carouselRef}>
          <FuturisticCarouselContainer>
            <Carousel
              onTicTacToeClick={handleTicTacToeClick}
              onSnakeClick={handleSnakeClick}
              onSnakesandLaddersClick={handleSnakesandLaddersClick}
            />
          </FuturisticCarouselContainer>
        </div>

        <h1 className="text-lg md:text-2xl lg:text-4xl font-bold w-full md:w-3/4 lg:w-3/6 h-auto border-4 rounded-3xl border-transparent transition-all duration-300 hover:shadow-xl text-center px-4 py-8">
          Every setback is a setup for a comeback. Embrace challenges as opportunities to grow. With each defeat, learn, adapt, and push harder. Remember, the road to victory is paved with persistence and skill. Keep grinding, and the triumph will be yours. Game on!
        </h1>
        <p onClick={handleGamesClick} className='mb-4 border-4 rounded-3xl border-transparent transition-all duration-300 cursor-pointer hover:border-cyan-400 hover:shadow-xl px-4 py-2'>
          Check the carousel for games!
        </p>
      </div>
      <div ref={footerRef}>
        <Foot />
      </div>
    </>
  );
}

export default App;