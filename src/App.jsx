import React, { useRef, useState } from 'react';
import reactImage from './assets/github.png';
import boyImage from './assets/boy.png';
import newImage from './assets/1269.png_860-removebg-preview.png';
import Nav from './components/Nav';
import Button from './Button';
import Button1 from './Button1';
import Foot from './components/Foot';

function App() {
  const footerRef = useRef(null);
  const [showButton, setShowButton] = useState(false); 
  const [showButton1, setShowButton1] = useState(false); 

  const handleReactImageClick = () => {
    window.open('https://github.com/nottysukku', '_blank');
  };

  const handleContactClick = (e) => {
    e.preventDefault();
    if (footerRef.current) {
      footerRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleTicTacToeClick = () => {
    setShowButton(true);
    setShowButton1(false); 
  };

  const handleSnakeClick = () => {
    setShowButton(false); 
    setShowButton1(true);
  };

  if (showButton) {
    return <Button />; 
  }
  if (showButton1) {
    return <Button1 />; 
  }

  return (
    <>
      <div className="relative min-h-[2rem] bg-[#1F2937] text-gray-100 flex flex-col md:flex-row justify-between items-center text-center p-4 group">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative flex w-full flex-col md:flex-row justify-between items-center space-x-4 z-10">
          <img
            src={reactImage}
            alt="react"
            onClick={handleReactImageClick}
            className="cursor-pointer w-16 h-16"
          />
          <div className="flex-grow  text-3xl font-bold text-gray-100 hover:text-black cursor-crosshair md:w-auto md:text-center">
          PlaySphere: Adventure Awaits
          
          </div>
          <Nav onContactClick={handleContactClick} onTicTacToeClick={handleTicTacToeClick} onSnakeClick={handleSnakeClick} />
        </div>
      </div>
      <div className="w-full min-h-screen bg-gradient-to-r from-black via-purple-500 to-black text-white flex flex-col justify-between items-center">
        <div className="flex flex-col justify-center items-center flex-grow space-y-4 p-4">
          <div className="flex flex-col md:flex-row md:space-x-4 w-full md:w-auto">
            <img src={boyImage} className='w-full md:w-5/12 border-4 rounded-3xl border-transparent transition-all duration-300 hover:border-red hover:shadow-2xl hover:shadow-red' alt="boy" />
            <img src={newImage} className='w-full md:w-5/12 border-4 rounded-3xl border-transparent transition-all duration-300 hover:border-red hover:shadow-2xl hover:shadow-red' alt="new" />
          </div>
          <h1 className="text-xl md:text-3xl lg:text-5xl font-bold w-full md:w-3/4 lg:w-3/6 h-auto md:h-96 border-4 rounded-3xl border-transparent transition-all duration-300 hover:border-red hover:shadow-2xl hover:shadow-red text-center px-4">
            Every setback is a setup for a comeback. Embrace challenges as opportunities to grow. With each defeat, learn, adapt, and push harder. Remember, the road to victory is paved with persistence and skill. Keep grinding, and the triumph will be yours. Game on!
          </h1>
        </div>
        <p className='mb-4 border-4 rounded-3xl border-transparent transition-all duration-300 cursor-pointer hover:border-cyan-400 hover:shadow-xl px-4'>
          Check the navbar for games!
        </p>
      </div>
      <div ref={footerRef}>
        <Foot />
      </div>
    </>
  );
}

export default App;
